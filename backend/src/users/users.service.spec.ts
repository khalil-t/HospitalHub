import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { RolesService } from '../roles/roles.service';
import { EncryptionService } from '../common/encryption.service';
import { UserRole } from '../common/enums/user-role.enum';

describe('UsersService bootstrap', () => {
  const usersRepository = {
    count: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  } as unknown as jest.Mocked<Repository<User>>;
  const rolesService = {
    findRoleByName: jest.fn(),
  } as unknown as jest.Mocked<RolesService>;
  const encryptionService = {
    encrypt: jest.fn((value: string) => `encrypted:${value}`),
    decrypt: jest.fn((value: string) => value.replace('encrypted:', '')),
  } as unknown as jest.Mocked<EncryptionService>;
  const service = new UsersService(
    usersRepository,
    rolesService,
    encryptionService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('closes registration when any user already exists', async () => {
    usersRepository.count.mockResolvedValue(1);

    await expect(
      service.registerAdmin({
        username: 'admin',
        email: 'admin@example.com',
        fullName: 'Admin User',
        password: 'secret123',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(rolesService.findRoleByName.mock.calls).toHaveLength(0);
    expect(usersRepository.save.mock.calls).toHaveLength(0);
  });

  it('creates the first user as a super admin and excludes sensitive fields', async () => {
    const adminRole = {
      id: 'role-1',
      name: UserRole.SUPER_ADMIN,
    } as unknown as Role;
    const createdUser = {
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      fullName: 'Admin User',
      hashedPassword: 'hashed-password',
      roles: [adminRole],
    } as User;

    usersRepository.count.mockResolvedValue(0);
    usersRepository.findOne.mockResolvedValue(null);
    rolesService.findRoleByName.mockResolvedValue(adminRole);
    usersRepository.create.mockReturnValue(createdUser);
    usersRepository.save.mockResolvedValue(createdUser);

    const result = await service.registerAdmin({
      username: 'admin',
      email: 'admin@example.com',
      fullName: 'Admin User',
      password: 'secret123',
    });

    expect(rolesService.findRoleByName.mock.calls[0]).toEqual([
      UserRole.SUPER_ADMIN,
    ]);
    const createArg = usersRepository.create.mock.calls[0][0] as Partial<User>;
    expect(createArg.roles).toEqual([adminRole]);
    expect(typeof createArg.hashedPassword).toBe('string');
    expect(createArg.hashedPassword).not.toBe('secret123');
    expect(result).toEqual({
      id: 'user-1',
      username: 'admin',
      email: 'admin@example.com',
      fullName: 'Admin User',
    });
    expect(result).not.toHaveProperty('hashedPassword');
    expect(result).not.toHaveProperty('refreshToken');
  });

  it('checks super admin existence without relying on an ADMIN role name', async () => {
    usersRepository.findOne.mockResolvedValue(null);

    await expect(service.checkAdminExists()).resolves.toEqual({
      exists: false,
    });
    expect(rolesService.findRoleByName.mock.calls).toHaveLength(0);

    usersRepository.findOne.mockResolvedValue({ id: 'user-1' } as User);

    await expect(service.checkAdminExists()).resolves.toEqual({ exists: true });
    expect(usersRepository.findOne.mock.calls[0]).toEqual([
      {
        where: { roles: { name: UserRole.SUPER_ADMIN } },
        relations: ['roles'],
      },
    ]);
  });
});
