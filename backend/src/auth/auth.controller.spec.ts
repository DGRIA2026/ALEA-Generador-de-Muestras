import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import type { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;
  const auth = {
    getRefreshTokenFromCookies: jest.fn(),
    refresh: jest.fn(),
    setRefreshCookie: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: auth }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('lee el refresh token mediante el nombre de cookie configurado', async () => {
    const cookies = { alea_refresh_token: 'refresh-token' };
    auth.getRefreshTokenFromCookies.mockReturnValue('refresh-token');
    auth.refresh.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'new-refresh-token',
    });
    const response = {} as Response;

    await expect(
      controller.refresh({ cookies } as unknown as Request, response),
    ).resolves.toEqual({ accessToken: 'access-token' });

    expect(auth.getRefreshTokenFromCookies).toHaveBeenCalledWith(cookies);
    expect(auth.refresh).toHaveBeenCalledWith('refresh-token');
    expect(auth.setRefreshCookie).toHaveBeenCalledWith(
      response,
      'new-refresh-token',
    );
  });
});
