import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  const payload = {
    to: 'usuario@example.com',
    fullName: 'Usuario de prueba',
    institution: 'Institucion',
    activationLink: 'https://example.com/activate',
  };

  function createService() {
    const config = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService;
    return new MailService(config);
  }

  it('falla inmediatamente con un mensaje claro cuando SMTP no esta configurado', async () => {
    const service = createService();

    await expect(service.sendInvitationEmail(payload)).rejects.toMatchObject({
      status: 503,
      response: { message: 'El servicio de correo no esta configurado.' },
    });
  });

  it('traduce un timeout de red y actualiza el diagnostico', async () => {
    const service = createService();
    const transporter = {
      sendMail: jest
        .fn()
        .mockRejectedValue(
          Object.assign(new Error('connect ETIMEDOUT'), { code: 'ETIMEDOUT' }),
        ),
    };
    (service as unknown as { transporter: typeof transporter }).transporter =
      transporter;

    await expect(service.sendInvitationEmail(payload)).rejects.toMatchObject({
      status: 503,
      response: {
        message:
          'No fue posible conectar con el servidor SMTP. Revisa la red, el host y el puerto.',
      },
    });
    expect(service.getStatus()).toEqual({
      configured: true,
      available: false,
      message:
        'No fue posible conectar con el servidor SMTP. Revisa la red, el host y el puerto.',
    });
  });

  it('marca el servicio como disponible despues de un envio exitoso', async () => {
    const service = createService();
    const transporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'message-1' }),
    };
    (service as unknown as { transporter: typeof transporter }).transporter =
      transporter;

    await service.sendInvitationEmail(payload);

    expect(service.getStatus().available).toBe(true);
  });

  it('verifica SMTP en segundo plano sin bloquear el arranque', () => {
    const service = createService();
    const transporter = {
      verify: jest.fn().mockReturnValue(new Promise(() => undefined)),
    };
    (service as unknown as { transporter: typeof transporter }).transporter =
      transporter;

    expect(service.onModuleInit()).toBeUndefined();
    expect(transporter.verify).toHaveBeenCalledTimes(1);
  });
});
