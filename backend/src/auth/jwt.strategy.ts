import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

type AccessTokenPayload = {
  sub?: string;
  email?: string;
  role?: 'admin' | 'auditor';
  type?: 'access' | 'refresh';
  authVersion?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: AccessTokenPayload) {
    if (!payload.sub || payload.type !== 'access') {
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

    return { id: user.id, email: user.email, role: user.role };
  }
}
