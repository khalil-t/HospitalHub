import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { RolesService } from '../roles/roles.service';
import { Role } from '../roles/entities/role.entity';
import { EncryptionService } from '../common/encryption.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private rolesService: RolesService,
    private encryptionService: EncryptionService,
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

  async registerAdmin(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password, fullName, phoneNumber } = createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const adminRole = await this.rolesService.findRoleByName('super_admin');
    if (!adminRole) {
      throw new NotFoundException(
        'super_admin role not found. Please create it first.',
      );
    }

    const userData: Partial<User> = {
      username,
      email,
      fullName,
      hashedPassword,
      phoneNumber,
      roles: [adminRole],
    };

    this.encryptUserData(userData);

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    return this.decryptUserData(savedUser);
  }

  async checkAdminExists(): Promise<{ exists: boolean }> {
    const adminRole = await this.rolesService.findRoleByName('ADMIN');
    if (!adminRole) {
      return { exists: false };
    }

    const adminUser = await this.usersRepository.findOne({
      where: { roles: { name: 'super_admin' } },
      relations: ['roles'],
    });

    return { exists: !!adminUser };
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { username, email, password, fullName, phoneNumber, roleIds } =
      createUserDto;

    const existingUser = await this.usersRepository.findOne({
      where: [{ username }, { email }],
    });
    if (existingUser)
      throw new ConflictException('Username or email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const roles: Role[] = [];
    if (roleIds) {
      for (const roleId of roleIds) {
        roles.push(await this.rolesService.findRoleById(roleId));
      }
    }

    const userData: Partial<User> = {
      username,
      email,
      fullName,
      hashedPassword,
      roles,
      phoneNumber,
    };

    this.encryptUserData(userData);

    const user = this.usersRepository.create(userData);
    const savedUser = await this.usersRepository.save(user);

    return this.decryptUserData(savedUser);
  }

  async findAll(serviceId?: string, roleName?: string): Promise<User[]> {
    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    queryBuilder
      .leftJoinAndSelect('user.roles', 'role')
      .leftJoinAndSelect('user.service', 'service');

    if (serviceId) {
      queryBuilder.andWhere('service.id = :serviceId', { serviceId });
    }

    if (roleName) {
      queryBuilder.andWhere('role.name = :roleName', { roleName });
    }
    const users = await queryBuilder.getMany();
    return users.map((user) => this.decryptUserData(user));
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles', 'service'],
    });
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { username },
      relations: ['roles'],
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id);
    const { username, email, fullName, roleIds, phoneNumber } = updateUserDto;

    if (username) user.username = username;
    if (email) user.email = email;
    if (fullName) user.fullName = fullName;
    if (phoneNumber) user.phoneNumber = phoneNumber;

    if (roleIds) {
      const roles: Role[] = [];
      for (const roleId of roleIds) {
        const role = await this.rolesService.findRoleById(roleId);
        roles.push(role);
      }
      user.roles = roles;
    }
    this.encryptUserData(user);

    const savedUser = await this.usersRepository.save(user);

    return this.decryptUserData(savedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async setRefreshToken(id: string, refreshToken: string): Promise<void> {
    const user = await this.findOne(id);
    user.refreshToken = refreshToken;
    await this.usersRepository.save(user);
  }

  async removeRefreshToken(id: string): Promise<void> {
    const user = await this.findOne(id);
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
