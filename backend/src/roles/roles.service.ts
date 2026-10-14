import {
  Injectable,
  NotFoundException,
  ConflictException,
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

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    private encryptionService: EncryptionService,
  ) {}

  private decryptUserData(user: User): User {
    if (user.fullName) {
      user.fullName = this.encryptionService.decrypt(user.fullName);
    }
    if (user.phoneNumber) {
      user.phoneNumber = this.encryptionService.decrypt(user.phoneNumber);
    }
    return user;
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<Role> {
    const { name, description, permissionIds } = createRoleDto;
    const existingRole = await this.roleRepository.findOne({ where: { name } });
    if (existingRole)
      throw new ConflictException(`Role '${name}' already exists`);

    const role = this.roleRepository.create({ name, description });

    if (permissionIds?.length) {
      const permissions = await this.permissionRepository.findBy({
        id: In(permissionIds),
      });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
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

  async findAllRoles(): Promise<Role[]> {
    const roles = await this.roleRepository.find({
      relations: ['users', 'permissions'],
    });

    roles.forEach((role) => {
      role.users?.forEach((user) => {
        this.decryptUserData(user);
      });
    });

    return roles;
  }

  async findRoleById(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return role;
  }

  async findRoleByName(name: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException(`Role '${name}' not found`);
    return role;
  }

  async updateRole(id: string, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const role = await this.findRoleById(id);
    const { name, description, permissionIds } = updateRoleDto;

    if (name && name !== role.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name },
      });
      if (existingRole)
        throw new ConflictException(`Role '${name}' already exists`);
      role.name = name;
    }

    if (description !== undefined) role.description = description;

    if (permissionIds !== undefined) {
      const permissions = await this.permissionRepository.findBy({
        id: In(permissionIds),
      });
      role.permissions = permissions;
    }

    return this.roleRepository.save(role);
  }

  async assignRole(userId: string, roleId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException(`User not found`);

    const role = await this.findRoleById(roleId);
    if (!user.roles.some((r) => r.id === role.id)) user.roles.push(role);

    return this.userRepository.save(user);
  }

  async updateUserRole(userId: string, roleId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException(`User not found`);

    const role = await this.findRoleById(roleId);
    user.roles = [role];

    return this.userRepository.save(user);
  }

  async removeRole(userId: string, roleId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException(`User not found`);

    user.roles = user.roles.filter((r) => r.id !== roleId);
    return this.userRepository.save(user);
  }

  async createPermission(
    createPermissionDto: CreatePermissionDto,
  ): Promise<Permission> {
    const { name, description } = createPermissionDto;
    const existingPermission = await this.permissionRepository.findOne({
      where: { name },
    });
    if (existingPermission)
      throw new ConflictException(`Permission '${name}' already exists`);

    const permission = this.permissionRepository.create({ name, description });
    return this.permissionRepository.save(permission);
  }

  async findAllPermissions(): Promise<Permission[]> {
    return this.permissionRepository.find();
  }

  async assignPermissions(
    roleId: string,
    permissionIds: string[],
  ): Promise<Role> {
    const role = await this.findRoleById(roleId);
    const permissions = await this.permissionRepository.findBy({
      id: In(permissionIds),
    });

    const existingPermissionIds = role.permissions.map((p) => p.id);
    const newPermissions = permissions.filter(
      (p) => !existingPermissionIds.includes(p.id),
    );
    role.permissions = [...role.permissions, ...newPermissions];

    return this.roleRepository.save(role);
  }

  async removePermission(roleId: string, permissionId: string): Promise<Role> {
    const role = await this.findRoleById(roleId);
    role.permissions = role.permissions.filter((p) => p.id !== permissionId);
    return this.roleRepository.save(role);
  }

  async getPermissionsForRole(roleName: string): Promise<string[]> {
    const role = await this.findRoleByName(roleName);
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
}
