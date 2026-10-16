import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import type { CookieOptions, Response } from 'express';
import { booleanValue, normalizeApiBasePath } from '../config/env.validation';

type JwtAuthPayload = {
  sub: string;
  email: string;
  role: 'admin' | 'auditor';
  type: 'access' | 'refresh';
  authVersion?: number;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private parseDurationToMs(value: string, fallbackMs: number): number {
    const match = /^(\d+)\s*([smhd])$/i.exec(value.trim());
    if (!match) return fallbackMs;

    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    if (!Number.isFinite(amount) || amount <= 0) return fallbackMs;

    if (unit === 's') return amount * 1000;
    if (unit === 'm') return amount * 60 * 1000;
    if (unit === 'h') return amount * 60 * 60 * 1000;
    if (unit === 'd') return amount * 24 * 60 * 60 * 1000;
    return fallbackMs;
  }

  private getRefreshMaxAgeMs(): number {
    const configured = this.config.get<string>('JWT_REFRESH_EXPIRES') || '7d';
    return this.parseDurationToMs(configured, 7 * 24 * 60 * 60 * 1000);
  }

  private getRefreshCookieName() {
    return (
      this.config.get<string>('COOKIE_NAME')?.trim() || 'alea_refresh_token'
    );
  }

  private getRefreshCookieOptions(): CookieOptions {
    const apiBasePath = normalizeApiBasePath(
      this.config.get<string>('API_BASE_PATH'),
    );
    const domain = this.config.get<string>('COOKIE_DOMAIN')?.trim();

    return {
      httpOnly: true,
      sameSite: 'lax',
      secure: booleanValue(this.config.get<string>('COOKIE_SECURE'), false),
      path: `${apiBasePath}/auth`,
      ...(domain ? { domain } : {}),
    };
  }

  private async signTokens(user: {
    id: string;
    email: string;
    role: 'admin' | 'auditor';
    authVersion: number;
  }) {
    const accessToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'access' as const,
        authVersion: user.authVersion,
      },
      {
        secret: this.config.get('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES') || '15m',
      },
    );

    const refreshToken = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: 'refresh' as const,
        authVersion: user.authVersion,
      },
      {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES') || '7d',
      },
    );

    return { accessToken, refreshToken };
  }

  setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(this.getRefreshCookieName(), refreshToken, {
      ...this.getRefreshCookieOptions(),
      maxAge: this.getRefreshMaxAgeMs(),
    });
  }

  getRefreshTokenFromCookies(cookies?: Record<string, unknown>) {
    const token = cookies?.[this.getRefreshCookieName()];
    return typeof token === 'string' ? token : undefined;
  }

  clearRefreshCookie(res: Response) {
    res.clearCookie(
      this.getRefreshCookieName(),
      this.getRefreshCookieOptions(),
    );
  }

  async login(email: string, password: string) {
    const user = await this.users.findByEmailWithPassword(email);
    if (!user) throw new UnauthorizedException('Usuario no encontrado.');

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Contrasena incorrecta.');

    if (user.status !== 'active') {
      throw new UnauthorizedException(
        'Cuenta pendiente. Revisa tu correo para activar tu cuenta.',
      );
    }

    await this.users.updateLastLogin(user.id);

    const tokens = await this.signTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      authVersion: user.authVersion,
    });

    const safeUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      institution: user.institution,
      institutionAcronym: user.institutionAcronym,
      position: user.position,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return {
      user: safeUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refresh(refreshToken: string | undefined) {
    if (!refreshToken) throw new UnauthorizedException('Sesion expirada.');

    let payload: JwtAuthPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtAuthPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Sesion expirada.');
    }

    if (!payload?.sub || payload.type !== 'refresh') {
      throw new UnauthorizedException('Sesion expirada.');
    }

    const user = await this.users.findById(payload.sub);
    if (
      !user ||
      user.status !== 'active' ||
      (payload.authVersion ?? 0) !== (user.authVersion ?? 0)
    ) {
      throw new UnauthorizedException('Sesion expirada.');
    }

    return this.signTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      authVersion: user.authVersion,
    });
  }
}
