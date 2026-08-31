import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { InviteUserDto } from './dto/invite-user.dto';
import { ResendInviteDto } from './dto/resend-invite.dto';
import { ActivateAccountDto } from './dto/activate-account.dto';
import { MailService } from '../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { User } from './user.entity';

type AuthenticatedRequest = {
  user: {
    id: string;
  };
};

@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  private toSafeUser(user: User) {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      institution: user.institution,
      institutionAcronym: user.institutionAcronym,
      position: user.position,
      lastLogin: user.lastLogin,
      lastUploadedFileHash: user.lastUploadedFileHash,
      uploadWindowStartedAt: user.uploadWindowStartedAt,
      uploadWindowEndsAt: user.uploadWindowEndsAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private resolveFrontendBase() {
    const frontendBase = this.config.get<string>('PUBLIC_FRONTEND_URL');
    if (!frontendBase?.trim()) {
      throw new Error('PUBLIC_FRONTEND_URL no esta configurada.');
    }
    return frontendBase.replace(/\/+$/, '');
  }

  private buildActivationLink(email: string, token: string) {
    const frontendBase = this.resolveFrontendBase();
    return `${frontendBase}/?action=activate&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  }

  private buildResetLink(email: string, token: string) {
    const frontendBase = this.resolveFrontendBase();
    return `${frontendBase}/?action=reset&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('mail-status')
  async getMailStatus() {
    return this.mail.checkConnection();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    return this.users.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @Post('invite')
  async invite(@Body() dto: InviteUserDto) {
    const { user, activationToken } = await this.users.inviteUser({
      email: dto.email,
      fullName: dto.fullName,
      role: dto.role,
      institution: dto.institution,
      institutionAcronym: dto.institutionAcronym,
      position: dto.position,
    });
    const activationLink = this.buildActivationLink(
      user.email,
      activationToken,
    );

    try {
      await this.mail.sendInvitationEmail({
        to: user.email,
        fullName: user.fullName,
        institution: user.institution,
        activationLink,
      });
    } catch {
      const mailStatus = this.mail.getStatus();
      return {
        message: `El usuario ${user.email} fue creado, pero no se pudo enviar la invitacion. ${mailStatus.message} Puedes reenviarla desde el directorio.`,
        user: this.toSafeUser(user),
        activationLink,
        emailSent: false,
        mailStatus,
      };
    }

    return {
      message: `Invitación enviada a ${user.email}`,
      user: this.toSafeUser(user),
      activationLink,
      emailSent: true,
      mailStatus: this.mail.getStatus(),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('resend-invite')
  async resendInvite(@Body() dto: ResendInviteDto) {
    const {
      user,
      activationToken,
      activationTokenHash,
      activationTokenExpiresAt,
    } = await this.users.resendInvite(dto.email);
    const activationLink = this.buildActivationLink(
      user.email,
      activationToken,
    );

    await this.mail.sendInvitationEmail({
      to: user.email,
      fullName: user.fullName,
      institution: user.institution,
      activationLink,
    });

    await this.users.commitInvitationToken(
      user.id,
      activationTokenHash,
      activationTokenExpiresAt,
    );

    return {
      message: `Invitación reenviada a ${user.email}`,
      activationLink,
      mailStatus: this.mail.getStatus(),
    };
  }

  @Post('activate')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async activate(@Body() dto: ActivateAccountDto) {
    const user = await this.users.activateAccount(dto.token, dto.password);
    return {
      message: 'Cuenta activada correctamente.',
      user: this.toSafeUser(user),
    };
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    const resetRequest = await this.users.issuePasswordReset(dto.email);

    if (resetRequest) {
      const { user, token, tokenHash, expiresAt } = resetRequest;
      const resetLink = this.buildResetLink(user.email, token);
      await this.mail.sendResetPasswordEmail({
        to: user.email,
        fullName: user.fullName,
        resetLink,
      });
      await this.users.commitPasswordResetToken(user.id, tokenHash, expiresAt);
    }

    return {
      message:
        'Si el correo existe, se envio un enlace para restablecer la contraseña.',
    };
  }

  @Post('reset-password')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.users.resetPassword(dto.token, dto.password);
    return {
      message: 'Contraseña restablecida correctamente.',
    };
  }

  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @Patch('me/password')
  async changePassword(
    @Body() dto: ChangePasswordDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const user = await this.users.changePassword(
      req.user.id,
      dto.currentPassword,
      dto.newPassword,
    );

    try {
      await this.mail.sendPasswordChangedEmail({
        to: user.email,
        fullName: user.fullName,
        changedAt: new Date(),
      });
      return {
        message: 'Contraseña actualizada correctamente.',
        emailSent: true,
      };
    } catch {
      return {
        message:
          'Contraseña actualizada correctamente, pero no se pudo enviar el aviso por correo.',
        emailSent: false,
      };
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const user = await this.users.updateUser(id, {
      fullName: dto.fullName,
      email: dto.email,
      role: dto.role,
      institution: dto.institution,
      institutionAcronym: dto.institutionAcronym,
      position: dto.position,
    });

    return {
      message: 'Usuario actualizado correctamente.',
      user: this.toSafeUser(user),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch(':id/reactivate-upload')
  async reactivateUpload(@Param('id') id: string) {
    const user = await this.users.reactivateFileUpload(id);
    return {
      message: 'Carga de archivo reactivada correctamente.',
      user: this.toSafeUser(user),
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    await this.users.deleteUser(id, req.user.id);
    return { message: 'Usuario eliminado correctamente.' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    const user = await this.users.findById(userId);

    if (!user) return null;

    return this.toSafeUser(user);
  }
}
