import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

describe('AuthService inactive users', () => {
  const usersService = {
    findByEmail: jest.fn(),
    findOne: jest.fn(),
    setRefreshToken: jest.fn(),
    removeRefreshToken: jest.fn(),
  } as unknown as jest.Mocked<UsersService>;
  const jwtService = {
    verify: jest.fn(),
  } as unknown as jest.Mocked<JwtService>;
  const service = new AuthService(usersService, jwtService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects login for an inactive user with valid credentials', async () => {
    const hashedPassword = await bcrypt.hash('secret123', 4);
    usersService.findByEmail.mockResolvedValue({
      id: 'user-1',
      hashedPassword,
      isActive: false,
      roles: [],
      service: null,
    } as User);

    await expect(
      service.validateUser('admin@example.com', 'secret123'),
    ).resolves.toBeNull();
    expect(usersService.setRefreshToken.mock.calls).toHaveLength(0);
  });

  it('rejects refresh for an inactive user', async () => {
    jwtService.verify.mockReturnValue({ sub: 'user-1' });
    usersService.findOne.mockResolvedValue({
      id: 'user-1',
      isActive: false,
      refreshToken: 'refresh-token',
    } as User);

    await expect(
      service.refreshToken('user-1', 'refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(usersService.setRefreshToken.mock.calls).toHaveLength(0);
  });
});
