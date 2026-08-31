import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';
import { InviteUserDto } from './dto/invite-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  const users = {
    inviteUser: jest.fn(),
    changePassword: jest.fn(),
    issuePasswordReset: jest.fn(),
    commitPasswordResetToken: jest.fn(),
  };
  const mail = {
    sendInvitationEmail: jest.fn(),
    sendResetPasswordEmail: jest.fn(),
    sendPasswordChangedEmail: jest.fn(),
    getStatus: jest.fn(),
  };
  const config = {
    get: jest
      .fn()
      .mockImplementation((key: string) =>
        key === 'PUBLIC_FRONTEND_URL'
          ? 'https://app.example.com/portal'
          : undefined,
      ),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: users },
        { provide: MailService, useValue: mail },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('conserva y devuelve el usuario pendiente cuando falla el primer correo', async () => {
    const institution =
      'Secretaría Ejecutiva del Sistema Nacional Anticorrupción';
    const position =
      'Jefe de Departamento de Calidad de Software y Procesos Institucionales';
    users.inviteUser.mockResolvedValue({
      user: {
        id: 'user-1',
        email: 'nuevo@example.com',
        fullName: 'Usuario nuevo',
        role: 'auditor',
        status: 'pending',
        institution,
        institutionAcronym: 'SESNA',
        position,
      },
      activationToken: 'token-1',
    });
    mail.sendInvitationEmail.mockRejectedValue(new Error('SMTP unavailable'));
    mail.getStatus.mockReturnValue({
      configured: true,
      available: false,
      message: 'No fue posible conectar con el servidor SMTP.',
    });

    const result = await controller.invite({
      email: 'nuevo@example.com',
      fullName: 'Usuario nuevo',
      role: 'auditor',
      institution,
      institutionAcronym: 'SESNA',
      position,
    } as InviteUserDto);

    expect(users.inviteUser).toHaveBeenCalledWith({
      email: 'nuevo@example.com',
      fullName: 'Usuario nuevo',
      role: 'auditor',
      institution,
      institutionAcronym: 'SESNA',
      position,
    });
    expect(result.emailSent).toBe(false);
    expect(result.user).toMatchObject({
      id: 'user-1',
      email: 'nuevo@example.com',
      status: 'pending',
    });
    expect(result.activationLink).toBe(
      'https://app.example.com/portal/?action=activate&email=nuevo%40example.com&token=token-1',
    );
  });

  it('crea el enlace de reset solo con la URL publica configurada', async () => {
    const expiresAt = new Date('2026-08-04T12:00:00.000Z');
    users.issuePasswordReset.mockResolvedValue({
      user: {
        id: 'user-reset',
        email: 'victima@example.com',
        fullName: 'Usuario activo',
      },
      token: 'reset-token',
      tokenHash: 'reset-hash',
      expiresAt,
    });
    mail.sendResetPasswordEmail.mockResolvedValue(undefined);
    users.commitPasswordResetToken.mockResolvedValue(undefined);

    await controller.requestPasswordReset({ email: 'victima@example.com' });

    expect(mail.sendResetPasswordEmail).toHaveBeenCalledWith({
      to: 'victima@example.com',
      fullName: 'Usuario activo',
      resetLink:
        'https://app.example.com/portal/?action=reset&email=victima%40example.com&token=reset-token',
    });
    expect(users.commitPasswordResetToken).toHaveBeenCalledWith(
      'user-reset',
      'reset-hash',
      expiresAt,
    );
  });

  it('confirma el cambio cuando el aviso por correo se envia', async () => {
    users.changePassword.mockResolvedValue({
      id: 'user-2',
      email: 'activo@example.com',
      fullName: 'Usuario activo',
    });
    mail.sendPasswordChangedEmail.mockResolvedValue(undefined);

    const result = await controller.changePassword(
      {
        currentPassword: 'Actual123',
        newPassword: 'NuevaClave123',
      },
      { user: { id: 'user-2' } },
    );

    expect(users.changePassword).toHaveBeenCalledWith(
      'user-2',
      'Actual123',
      'NuevaClave123',
    );
    expect(result.emailSent).toBe(true);
  });

  it('conserva el cambio si falla el aviso por correo', async () => {
    users.changePassword.mockResolvedValue({
      id: 'user-3',
      email: 'activo@example.com',
      fullName: 'Usuario activo',
    });
    mail.sendPasswordChangedEmail.mockRejectedValue(
      new Error('SMTP unavailable'),
    );

    const result = await controller.changePassword(
      {
        currentPassword: 'Actual123',
        newPassword: 'NuevaClave123',
      },
      { user: { id: 'user-3' } },
    );

    expect(result.emailSent).toBe(false);
    expect(result.message).toContain('actualizada correctamente');
  });
});
