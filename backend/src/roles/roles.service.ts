import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { User } from '../users/entities/user.entity';
import { Permission } from './entities/permissions.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { EncryptionService } from '../common/encryption.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { UserRole } from '../common/enums/user-role.enum';
import {
  canAssignRoleName,
  getAssignableRoles,
  isUserRole,
  toUserRoles,
} from '../auth/policy/role-assignment.rules';
import {
  UserResponseDto,
  UserSummaryDto,
} from '../users/dto/user-response.dto';
import { toUserResponse, toUserSummary } from '../users/user-response.mapper';
import {
  PermissionResponseDto,
  RoleOptionDto,
  RoleResponseDto,
} from './dto/role-response.dto';
import {
  toPermissionResponseDto,
  toRoleOption,
  toRoleResponse,
} from './role-response.mapper';

const CANONICAL_ROLES: ReadonlyArray<{ name: UserRole; description: string }> =
  [
    { name: UserRole.SUPER_ADMIN, description: 'Full system administration' },
    { name: UserRole.SERVICE_HEAD, description: 'Manages a clinical service' },
    {
      name: UserRole.INTERNAL_DOCTOR,
      description: 'Internal clinician with patient access',
    },
    {
      name: UserRole.EXTERNAL_DOCTOR,
      description: 'Approved external clinician with shared access',
    },
    {
      name: UserRole.ADMISSION_AGENT,
      description: 'Patient intake and demographics',
    },
    {
      name: UserRole.VERIFICATION_CLERK,
      description: 'Audit and compliance reviewer',
    },
    { name: UserRole.RADIOLOGIST, description: 'Imaging specialist' },
    {
      name: UserRole.LABORATORY_TECHNICIAN,
      description: 'Laboratory specialist',
    },
  ];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private encryptionService: EncryptionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureCanonicalRoles();
  }

  private async ensureCanonicalRoles(): Promise<void> {
    const existingRoles = await this.roleRepository.find({
      select: ['name'],
    });
    const existingNames = new Set(existingRoles.map((role) => role.name));
    const missingRoles = CANONICAL_ROLES.filter(
      (role) => !existingNames.has(role.name),
    );

    if (!missingRoles.length) {
      return;
    }

    await this.roleRepository.save(
      missingRoles.map((role) => this.roleRepository.create(role)),
    );
  }

  private decryptUserData(user: User): User {
    if (user.fullName) {
      user.fullName = this.encryptionService.decrypt(user.fullName);
    }
    if (user.phoneNumber) {
      user.phoneNumber = this.encryptionService.decrypt(user.phoneNumber);
    }
    return user;
  }

  private hasRole(user: User, roleName: UserRole): boolean {
    return (user.roles ?? []).some((role) => role.name === roleName);
  }

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return toUserRoles(actor.roles).includes(UserRole.SUPER_ADMIN);
  }

  private toSafeUser(
    actor: AuthenticatedUser,
    user: User,
  ): UserResponseDto | UserSummaryDto {
    const decryptedUser = this.decryptUserData(user);
    return this.isSuperAdmin(actor)
      ? toUserResponse(decryptedUser)
      : toUserSummary(decryptedUser);
  }

  private async findAssignmentTarget(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'service'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  private assertCanManageTarget(actor: AuthenticatedUser, target: User): void {
    if (this.isSuperAdmin(actor)) {
      return;
    }

    const actorRoles = toUserRoles(actor.roles);
    if (!actorRoles.includes(UserRole.SERVICE_HEAD)) {
      throw new ForbiddenException();
    }

    if (this.hasRole(target, UserRole.SUPER_ADMIN)) {
      throw new ForbiddenException('Service heads cannot manage super admins');
    }

    if (!actor.serviceId || target.service?.id !== actor.serviceId) {
      throw new NotFoundException('User not found');
    }
  }

  private assertNotSelf(actor: AuthenticatedUser, target: User): void {
    if (actor.id === target.id) {
      throw new ForbiddenException('You cannot change your own roles');
    }
  }

  private assertRoleAssignable(
    actor: AuthenticatedUser,
    roleName: string,
  ): void {
    if (!canAssignRoleName(actor.roles, roleName)) {
      throw new ForbiddenException('You cannot assign or remove this role');
    }
  }

  private async assertLastSuperAdmin(target: User): Promise<void> {
    if (!this.hasRole(target, UserRole.SUPER_ADMIN)) {
      return;
    }

    const superAdminCount = await this.countSuperAdmins();
    if (superAdminCount <= 1) {
      throw new ConflictException(
        'The last super admin cannot be removed or demoted',
      );
    }
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<RoleResponseDto> {
    const { name, description, permissionIds } = createRoleDto;
    const existingRole = await this.roleRepository.findOne({ where: { name } });
    if (existingRole) {
      throw new ConflictException(`Role '${name}' already exists`);
    }

    const role = this.roleRepository.create({ name, description });

    if (permissionIds?.length) {
      const permissions = await this.permissionRepository.findBy({
        id: In(permissionIds),
      });
      role.permissions = permissions;
    }

    return toRoleResponse(await this.roleRepository.save(role));
  }

  async remove(id: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role with ID ${id} not found`);
    }

    const usersWithRole = await this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('role.id = :roleId', { roleId: id })
      .getCount();

    if (usersWithRole > 0) {
      throw new ConflictException(
        `Cannot delete role "${role.name}". ${usersWithRole} users are still assigned to this role. Please remove the role from all users first.`,
      );
    }

    await this.roleRepository.delete(id);
  }

  async findAllRoles(): Promise<RoleResponseDto[]> {
    const roles = await this.roleRepository.find({
      relations: ['permissions'],
      order: { name: 'ASC' },
    });

    return roles.map(toRoleResponse);
  }

  async getRoleEntityById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async getRoleEntityByName(name: UserRole): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role '${name}' not found`);
    return role;
  }

  async findRoleEntitiesByIds(ids: string[]): Promise<Role[]> {
    const uniqueIds = [...new Set(ids)];
    if (!uniqueIds.length) {
      return [];
    }

    const roles = await this.roleRepository.findBy({
      id: In(uniqueIds),
    });
    if (roles.length !== uniqueIds.length) {
      throw new NotFoundException('One or more roles not found');
    }

    return roles;
  }

  async findRoleById(id: string): Promise<RoleResponseDto> {
    return toRoleResponse(await this.getRoleEntityById(id));
  }

  async findRoleByName(name: string): Promise<RoleResponseDto> {
    if (!isUserRole(name)) {
      throw new BadRequestException(`Unknown role '${name}'`);
    }
    return toRoleResponse(await this.getRoleEntityByName(name));
  }

  async findAssignableRoles(
    actor: AuthenticatedUser,
  ): Promise<RoleOptionDto[]> {
    const actorRoles = toUserRoles(actor.roles);
    const canManage =
      actorRoles.includes(UserRole.SUPER_ADMIN) ||
      actorRoles.includes(UserRole.SERVICE_HEAD);
    if (!canManage) {
      throw new ForbiddenException();
    }

    const assignableRoles = getAssignableRoles(actor.roles);
    if (!assignableRoles.length) {
      return [];
    }

    const roles = await this.roleRepository.find({
      where: { name: In(assignableRoles) },
      order: { name: 'ASC' },
    });

    return roles.map(toRoleOption);
  }

  async updateRole(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<RoleResponseDto> {
    const role = await this.getRoleEntityById(id);
    const { name, description, permissionIds } = updateRoleDto;

    if (name && name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name },
      });
      if (existingRole) {
        throw new ConflictException(`Role '${name}' already exists`);
      }
      role.name = name;
    }

    if (description !== undefined) role.description = description;

    if (permissionIds !== undefined) {
      const permissions = await this.permissionRepository.findBy({
        id: In(permissionIds),
      });
      role.permissions = permissions;
    }

    return toRoleResponse(await this.roleRepository.save(role));
  }

  async assignRole(
    userId: string,
    roleId: string,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const user = await this.findAssignmentTarget(userId);
    this.assertNotSelf(actor, user);
    this.assertCanManageTarget(actor, user);

    const role = await this.getRoleEntityById(roleId);
    this.assertRoleAssignable(actor, role.name);

    if (!user.roles.some((assignedRole) => assignedRole.id === role.id)) {
      user.roles.push(role);
      await this.userRepository.save(user);
    }

    return this.toSafeUser(actor, user);
  }

  async updateUserRole(
    userId: string,
    roleId: string,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const user = await this.findAssignmentTarget(userId);
    this.assertNotSelf(actor, user);
    this.assertCanManageTarget(actor, user);

    const role = await this.getRoleEntityById(roleId);
    this.assertRoleAssignable(actor, role.name);

    if (role.name !== UserRole.SUPER_ADMIN) {
      await this.assertLastSuperAdmin(user);
    }

    user.roles = [role];
    await this.userRepository.save(user);

    return this.toSafeUser(actor, user);
  }

  async removeRole(
    userId: string,
    roleId: string,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const user = await this.findAssignmentTarget(userId);
    this.assertNotSelf(actor, user);
    this.assertCanManageTarget(actor, user);

    const role = await this.getRoleEntityById(roleId);
    this.assertRoleAssignable(actor, role.name);

    if (role.name === UserRole.SUPER_ADMIN) {
      await this.assertLastSuperAdmin(user);
    }

    user.roles = user.roles.filter(
      (assignedRole) => assignedRole.id !== role.id,
    );
    await this.userRepository.save(user);

    return this.toSafeUser(actor, user);
  }

  async createPermission(
    createPermissionDto: CreatePermissionDto,
  ): Promise<PermissionResponseDto> {
    const { name, description } = createPermissionDto;
    const existingPermission = await this.permissionRepository.findOne({
      where: { name },
    });
    if (existingPermission) {
      throw new ConflictException(`Permission '${name}' already exists`);
    }

    const permission = this.permissionRepository.create({ name, description });
    return toPermissionResponseDto(
      await this.permissionRepository.save(permission),
    );
  }

  async findAllPermissions(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionRepository.find();
    return permissions.map(toPermissionResponseDto);
  }

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<RoleResponseDto> {
    const role = await this.getRoleEntityById(roleId);
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });

    const existingPermissionIds = role.permissions.map((p) => p.id);
    const newPermissions = permissions.filter(
      (p) => !existingPermissionIds.includes(p.id),
    );
    role.permissions = [...role.permissions, ...newPermissions];

    return toRoleResponse(await this.roleRepository.save(role));
  }

  async removePermission(
    roleId: string,
    permissionId: string,
  ): Promise<RoleResponseDto> {
    const role = await this.getRoleEntityById(roleId);
    role.permissions = role.permissions.filter((p) => p.id !== permissionId);
    return toRoleResponse(await this.roleRepository.save(role));
  }

  async getPermissionsForRole(roleName: UserRole): Promise<string[]> {
    const role = await this.getRoleEntityByName(roleName);
    return role.permissions.map((p) => p.name);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) throw new NotFoundException('User not found');

    const permissions = user.roles.flatMap((r) => r.permissions);
    return [...new Set(permissions.map((p) => p.name))];
  }

  async countSuperAdmins(): Promise<number> {
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('role.name = :roleName', {
        roleName: UserRole.SUPER_ADMIN,
      })
      .getCount();
  }
}
