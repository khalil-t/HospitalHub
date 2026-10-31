import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterAdminResponseDto } from './dto/register-admin-response.dto';
import { AdminExistsResponseDto } from './dto/admin-exists-response.dto';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/entities/role.entity';
import { EncryptionService } from '../common/encryption.service';
import { UserRole } from '../common/enums/user-role.enum';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { ServicesService } from '../services/services.service';
import { Service } from '../services/entities/department.entity';
import {
  canAssignRoleName,
  toUserRoles,
} from '../auth/policy/role-assignment.rules';
import { toUserResponse, toUserSummary } from './user-response.mapper';
import { UserResponseDto, UserSummaryDto } from './dto/user-response.dto';
import { RoleOptionDto } from '../roles/dto/role-response.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rolesService: RolesService,
    private encryptionService: EncryptionService,
    private servicesService: ServicesService,
  ) {}

  private encryptUserData(user: Partial<User>): void {
    if (user.fullName) {
      user.fullName = this.encryptionService.encrypt(user.fullName);
    }

    if (user.phoneNumber) {
      user.phoneNumber = this.encryptionService.encrypt(user.phoneNumber);
    }
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

  private async findUserEntity(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'service'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  private hasRole(user: User, roleName: UserRole): boolean {
    return (user.roles ?? []).some((role) => role.name === roleName);
  }

  private isSuperAdmin(actor: AuthenticatedUser): boolean {
    return toUserRoles(actor.roles).includes(UserRole.SUPER_ADMIN);
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

  private async resolveServiceForCreate(
    actor: AuthenticatedUser,
    serviceId?: string,
  ): Promise<Service | null> {
    if (this.isSuperAdmin(actor)) {
      return serviceId ? this.servicesService.findOne(serviceId) : null;
    }

    const actorRoles = toUserRoles(actor.roles);
    if (!actorRoles.includes(UserRole.SERVICE_HEAD)) {
      throw new ForbiddenException();
    }

    if (!actor.serviceId) {
      throw new ForbiddenException('Service head is not assigned to a service');
    }

    if (serviceId && serviceId !== actor.serviceId) {
      throw new ForbiddenException(
        'You can only manage users in your own service',
      );
    }

    return this.servicesService.findOne(actor.serviceId);
  }

  private async resolveServiceForUpdate(
    actor: AuthenticatedUser,
    serviceId: string,
  ): Promise<Service> {
    if (this.isSuperAdmin(actor)) {
      return this.servicesService.findOne(serviceId);
    }

    if (!actor.serviceId || serviceId !== actor.serviceId) {
      throw new ForbiddenException(
        'You can only manage users in your own service',
      );
    }

    return this.servicesService.findOne(actor.serviceId);
  }

  private async resolveRolesForActor(
    actor: AuthenticatedUser,
    roleIds: string[],
  ): Promise<Role[]> {
    const roles = await this.rolesService.findRoleEntitiesByIds(roleIds);

    const canAssignAll = roles.every((role) =>
      canAssignRoleName(actor.roles, role.name),
    );
    if (!canAssignAll) {
      throw new ForbiddenException(
        'You cannot assign one or more of the requested roles',
      );
    }

    return roles;
  }

  private async assertCanRemoveSuperAdmin(target: User): Promise<void> {
    if (!this.hasRole(target, UserRole.SUPER_ADMIN)) {
      return;
    }

    const superAdminCount = await this.rolesService.countSuperAdmins();
    if (superAdminCount <= 1) {
      throw new ConflictException(
        'The last super admin cannot be removed or demoted',
      );
    }
  }

  private async persistUser(
    createUserDto: CreateUserDto | RegisterAdminDto,
    service: Service | null,
    roles: Role[],
  ): Promise<User> {
    const { username, email, password, fullName, phoneNumber } = createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData: Partial<User> = {
      username,
      email,
      fullName,
      hashedPassword,
      phoneNumber,
      roles,
    };
    if (service) {
      userData.service = service;
    }

    this.encryptUserData(userData);

    const user = this.usersRepository.create(userData);
    return this.usersRepository.save(user);
  }

  async registerAdmin(
    registerAdminDto: RegisterAdminDto,
  ): Promise<RegisterAdminResponseDto> {
    const userCount = await this.usersRepository.count();
    if (userCount > 0) {
      throw new NotFoundException('Registration is closed');
    }

    const adminRole = await this.rolesService.getRoleEntityByName(
      UserRole.SUPER_ADMIN,
    );
    const savedUser = await this.persistUser(registerAdminDto, null, [
      adminRole,
    ]);
    const decryptedUser = this.decryptUserData(savedUser);

    return {
      id: decryptedUser.id,
      username: decryptedUser.username,
      email: decryptedUser.email,
      fullName: decryptedUser.fullName,
    };
  }

  async checkAdminExists(): Promise<AdminExistsResponseDto> {
    const adminUser = await this.usersRepository.findOne({
      where: { roles: { name: UserRole.SUPER_ADMIN } },
      relations: ['roles'],
    });

    return { exists: !!adminUser };
  }

  async create(
    createUserDto: CreateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const service = await this.resolveServiceForCreate(
      actor,
      createUserDto.serviceId,
    );
    const roles = await this.resolveRolesForActor(
      actor,
      createUserDto.roleIds ?? [],
    );
    const savedUser = await this.persistUser(createUserDto, service, roles);
    const decryptedUser = this.decryptUserData(savedUser);

    if (this.isSuperAdmin(actor)) {
      return toUserResponse(decryptedUser);
    }
    return toUserSummary(decryptedUser) as UserResponseDto;
  }

  async createExternalDoctorUser(createUserDto: CreateUserDto): Promise<User> {
    const externalDoctorRole = await this.rolesService.getRoleEntityByName(
      UserRole.EXTERNAL_DOCTOR,
    );

    return this.persistUser(createUserDto, null, [externalDoctorRole]);
  }

  async findAll(
    serviceId: string | undefined,
    roleName: string | undefined,
    actor: AuthenticatedUser,
  ): Promise<Array<UserResponseDto | UserSummaryDto>> {
    const isSuperAdmin = this.isSuperAdmin(actor);
    const actorRoles = toUserRoles(actor.roles);

    if (!isSuperAdmin && !actorRoles.includes(UserRole.SERVICE_HEAD)) {
      throw new ForbiddenException();
    }

    let effectiveServiceId = serviceId;
    if (!isSuperAdmin) {
      if (!actor.serviceId) {
        throw new ForbiddenException(
          'Service head is not assigned to a service',
        );
      }
      if (serviceId && serviceId !== actor.serviceId) {
        throw new ForbiddenException(
          'You can only view users in your own service',
        );
      }
      effectiveServiceId = actor.serviceId;
    }

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    queryBuilder
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.service', 'service');

    if (effectiveServiceId) {
      queryBuilder.andWhere('service.id = :serviceId', {
        serviceId: effectiveServiceId,
      });
    }

    if (roleName) {
      queryBuilder.andWhere('role.name = :roleName', { roleName });
    }

    const users = await queryBuilder.getMany();

    return users.map((user) => {
      const decryptedUser = this.decryptUserData(user);
      return isSuperAdmin
        ? toUserResponse(decryptedUser)
        : toUserSummary(decryptedUser);
    });
  }

  async findOne(id: string): Promise<User> {
    return this.decryptUserData(await this.findUserEntity(id));
  }

  async findAssignableRoles(
    actor: AuthenticatedUser,
  ): Promise<RoleOptionDto[]> {
    return this.rolesService.findAssignableRoles(actor);
  }

  async findOneForActor(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const user = await this.findUserEntity(id);

    if (this.isSuperAdmin(actor)) {
      return toUserResponse(this.decryptUserData(user));
    }

    this.assertCanManageTarget(actor, user);
    return toUserSummary(this.decryptUserData(user));
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['roles'],
    });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<UserResponseDto | UserSummaryDto> {
    const user = await this.findUserEntity(id);
    this.assertCanManageTarget(actor, user);

    if (updateUserDto.roleIds !== undefined && actor.id === id) {
      throw new ForbiddenException('You cannot change your own roles');
    }

    if (updateUserDto.username && updateUserDto.username !== user.username) {
      const existingUsername = await this.usersRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException('Username already exists');
      }
      user.username = updateUserDto.username;
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingEmail = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email already exists');
      }
      user.email = updateUserDto.email;
    }

    if (updateUserDto.fullName !== undefined) {
      user.fullName = this.encryptionService.encrypt(updateUserDto.fullName);
    }

    if (updateUserDto.phoneNumber !== undefined) {
      user.phoneNumber = this.encryptionService.encrypt(
        updateUserDto.phoneNumber,
      );
    }

    if (updateUserDto.isActive !== undefined) {
      if (updateUserDto.isActive === false) {
        await this.assertCanRemoveSuperAdmin(user);
      }
      user.isActive = updateUserDto.isActive;
    }

    if (updateUserDto.serviceId !== undefined) {
      user.service = await this.resolveServiceForUpdate(
        actor,
        updateUserDto.serviceId,
      );
    }

    if (updateUserDto.roleIds !== undefined) {
      const roles = await this.resolveRolesForActor(
        actor,
        updateUserDto.roleIds,
      );
      const keepsSuperAdmin = roles.some(
        (role) => role.name === UserRole.SUPER_ADMIN,
      );

      if (this.hasRole(user, UserRole.SUPER_ADMIN) && !keepsSuperAdmin) {
        if (!this.isSuperAdmin(actor)) {
          throw new ForbiddenException(
            'Only a super admin can change a super admin role',
          );
        }
        await this.assertCanRemoveSuperAdmin(user);
      }

      user.roles = roles;
    }

    const savedUser = await this.usersRepository.save(user);
    const decryptedUser = this.decryptUserData(savedUser);

    return this.isSuperAdmin(actor)
      ? toUserResponse(decryptedUser)
      : toUserSummary(decryptedUser);
  }

  async remove(id: string, actor: AuthenticatedUser): Promise<void> {
    const user = await this.findUserEntity(id);
    this.assertCanManageTarget(actor, user);
    await this.assertCanRemoveSuperAdmin(user);
    await this.usersRepository.remove(user);
  }

  async setRefreshToken(id: string, refreshToken: string): Promise<void> {
    const user = await this.findUserEntity(id);
    user.refreshToken = refreshToken;
    await this.usersRepository.save(user);
  }

  async removeRefreshToken(id: string): Promise<void> {
    const user = await this.findUserEntity(id);
    user.refreshToken = null;
    await this.usersRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await this.usersRepository.findOne({
        where: { email },
        relations: ['roles', 'service'],
      });
      return user;
    } catch {
      return null;
    }
  }
}
