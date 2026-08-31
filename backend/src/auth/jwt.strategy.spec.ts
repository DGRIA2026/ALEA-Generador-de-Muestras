import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../users/users.service';

describe('JwtStrategy', () => {
  const users = {
    findById: jest.fn(),
  };
  const config = {
    get: jest.fn().mockReturnValue('test-secret'),
  };
  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(
      config as unknown as ConfigService,
      users as unknown as UsersService,
    );
  });

  it('acepta un access token con la version vigente', async () => {
    users.findById.mockResolvedValue({
      id: 'user-1',
      email: 'activo@example.com',
      role: 'auditor',
      status: 'active',
      authVersion: 2,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        type: 'access',
        authVersion: 2,
      }),
    ).resolves.toEqual({
      id: 'user-1',
      email: 'activo@example.com',
      role: 'auditor',
    });
  });

  it('rechaza un access token de una version anterior', async () => {
    users.findById.mockResolvedValue({
      id: 'user-1',
      status: 'active',
      authVersion: 3,
    });

    await expect(
      strategy.validate({
        sub: 'user-1',
        type: 'access',
        authVersion: 2,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
