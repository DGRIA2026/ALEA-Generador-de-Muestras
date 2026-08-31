import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import type { Response } from 'express';

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findById: jest.fn(),
  };
  const jwt = {
    verifyAsync: jest.fn(),
    signAsync: jest.fn(),
  };
  const config = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    config.get.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rechaza un refresh token de una version anterior', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      type: 'refresh',
      authVersion: 0,
    });
    users.findById.mockResolvedValue({
      id: 'user-1',
      email: 'activo@example.com',
      role: 'auditor',
      status: 'active',
      authVersion: 1,
    });

    await expect(service.refresh('refresh-token')).rejects.toThrow(
      'Sesion expirada.',
    );
  });

  it('acepta tokens heredados sin version para usuarios en version cero', async () => {
    jwt.verifyAsync.mockResolvedValue({
      sub: 'user-2',
      type: 'refresh',
    });
    users.findById.mockResolvedValue({
      id: 'user-2',
      email: 'activo@example.com',
      role: 'auditor',
      status: 'active',
      authVersion: 0,
    });
    jwt.signAsync
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    await expect(service.refresh('legacy-refresh-token')).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });

  it('configura la cookie con nombre, dominio, seguridad y path del API', () => {
    const settings: Record<string, string> = {
      API_BASE_PATH: '/servicios/alea-api/',
      COOKIE_NAME: 'alea_refresh',
      COOKIE_DOMAIN: 'alea.sesna.gob.mx',
      COOKIE_SECURE: 'true',
      JWT_REFRESH_EXPIRES: '2d',
    };
    config.get.mockImplementation((key: string) => settings[key]);
    const cookie = jest.fn();
    const response = {
      cookie,
    } as unknown as Response;

    service.setRefreshCookie(response, 'refresh-token');

    expect(cookie).toHaveBeenCalledWith('alea_refresh', 'refresh-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: true,
      domain: 'alea.sesna.gob.mx',
      path: '/servicios/alea-api/auth',
      maxAge: 2 * 24 * 60 * 60 * 1000,
    });
  });

  it('borra la misma cookie y omite el dominio cuando esta vacio', () => {
    const settings: Record<string, string> = {
      API_BASE_PATH: '/',
      COOKIE_NAME: '',
      COOKIE_DOMAIN: '',
      COOKIE_SECURE: 'false',
    };
    config.get.mockImplementation((key: string) => settings[key]);
    const clearCookie = jest.fn();
    const response = {
      clearCookie,
    } as unknown as Response;

    service.clearRefreshCookie(response);

    expect(clearCookie).toHaveBeenCalledWith('alea_refresh_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/auth',
    });
  });

  it('lee el refresh token con el nombre configurable de la cookie', () => {
    config.get.mockImplementation((key: string) =>
      key === 'COOKIE_NAME' ? 'sesion_alea' : undefined,
    );

    expect(
      service.getRefreshTokenFromCookies({
        refreshToken: 'token-equivocado',
        sesion_alea: 'token-correcto',
      }),
    ).toBe('token-correcto');
    expect(service.getRefreshTokenFromCookies(undefined)).toBeUndefined();
  });
});
