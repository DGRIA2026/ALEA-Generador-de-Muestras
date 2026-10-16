import {
  Body,
  Controller,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { refreshToken, ...loginResult } = await this.auth.login(
      dto.email,
      dto.password,
    );
    this.auth.setRefreshCookie(res, refreshToken);
    return loginResult;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const refreshToken = this.auth.getRefreshTokenFromCookies(req.cookies);
      const tokens = await this.auth.refresh(refreshToken);
      this.auth.setRefreshCookie(res, tokens.refreshToken);
      return { accessToken: tokens.accessToken };
    } catch (error) {
      this.auth.clearRefreshCookie(res);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Sesion expirada.');
    }
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    this.auth.clearRefreshCookie(res);
    return { message: 'Sesion cerrada.' };
  }
}
