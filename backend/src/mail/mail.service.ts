import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

type InvitationEmailPayload = {
  to: string;
  fullName: string;
  activationLink: string;
  institution?: string;
};

type ResetPasswordEmailPayload = {
  to: string;
  fullName: string;
  resetLink: string;
};

type PasswordChangedEmailPayload = {
  to: string;
  fullName: string;
  changedAt: Date;
};

export type MailStatus = {
  configured: boolean;
  available: boolean;
  message: string;
};

type MailError = Error & {
  code?: string;
  responseCode?: number;
  command?: string;
};

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly from: string;
  private status: MailStatus = {
    configured: false,
    available: false,
    message: 'El servicio de correo no esta configurado.',
  };

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('MAIL_HOST');
    const port = Number(this.config.get<string>('MAIL_PORT'));
    const secure = this.config.get<string>('MAIL_SECURE') === 'true';
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');
    const connectionTimeout = this.getTimeout(
      'MAIL_CONNECTION_TIMEOUT_MS',
      10_000,
    );
    const greetingTimeout = this.getTimeout('MAIL_GREETING_TIMEOUT_MS', 10_000);
    const socketTimeout = this.getTimeout('MAIL_SOCKET_TIMEOUT_MS', 20_000);
    this.from = this.config.get<string>('MAIL_FROM') || user || '';

    if (!host || !port || !this.from) {
      this.logger.warn(
        'SMTP no configurado. Define MAIL_HOST, MAIL_PORT y MAIL_FROM para habilitar envio de invitaciones.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      connectionTimeout,
      greetingTimeout,
      socketTimeout,
      tls: {
        rejectUnauthorized: false,
      },
    });
    this.status = {
      configured: true,
      available: false,
      message:
        'La conexion con el servidor de correo aun no ha sido verificada.',
    };
  }

  onModuleInit() {
    void this.checkConnection();
  }

  getStatus(): MailStatus {
    return { ...this.status };
  }

  async checkConnection(): Promise<MailStatus> {
    if (!this.transporter) return this.getStatus();

    try {
      await this.transporter.verify();
      this.status = {
        configured: true,
        available: true,
        message: 'El servicio de correo esta disponible.',
      };
      this.logger.log('Conexion SMTP verificada correctamente.');
    } catch (error: unknown) {
      const message = this.toUserMessage(error);
      this.status = { configured: true, available: false, message };
      this.logMailError('No se pudo verificar SMTP', error);
    }

    return this.getStatus();
  }

  async sendInvitationEmail(payload: InvitationEmailPayload) {
    if (!this.transporter) {
      throw new ServiceUnavailableException(this.status.message);
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Activación de Cuenta</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td, a { font-family: Arial, sans-serif !important; }
    </style>
    <![endif]-->
    <style>
        body {
            margin: 0;
            padding: 0;
            background-color: #f9fafb;
            -webkit-font-smoothing: antialiased;
        }
        .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .card {
            background-color: #ffffff;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
            border: 1px solid #eef2f6;
        }
        .logo-area {
            text-align: center;
            margin-bottom: 30px;
        }
        .header-title {
            color: #1a1a1a;
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.3;
            margin: 0 0 20px 0;
            text-align: center;
        }
        .text-p {
            color: #4b5563;
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 20px;
        }
        .button-container {
            text-align: center;
            margin: 35px 0;
        }
        .btn-modern {
            background-color: #7a3e7c;
            color: #ffffff !important;
            display: inline-block;
            padding: 14px 32px;
            text-decoration: none;
            border-radius: 8px;
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
            transition: background-color 0.3s ease;
        }
        .link-alt {
            background-color: #f3f4f6;
            padding: 15px;
            border-radius: 6px;
            word-break: break-all;
            font-size: 13px;
            color: #7a3e7c;
            font-family: monospace;
            text-align: center;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #9ca3af;
            font-family: 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 13px;
        }
        .divider {
            height: 1px;
            background-color: #e5e7eb;
            margin: 30px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo-area">
            <span style="color: #7a3e7c; font-weight: 800; font-size: 20px; font-family: sans-serif; letter-spacing: -0.5px;">PDN</span>
        </div>

        <div class="card">
            <h1 class="header-title">Invitación a la Plataforma Digital Nacional</h1>

            <p class="text-p">Hola <strong>${this.escapeHtml(payload.fullName)}</strong>,</p>

            <p class="text-p">
                Tu cuenta ha sido creada exitosamente para la <strong>${this.escapeHtml(payload.institution || 'Plataforma Digital Nacional')}</strong>.
                Estamos listos para que comiences a utilizar la plataforma.
            </p>

            <div class="button-container">
                <a href="${this.escapeHtml(payload.activationLink)}" class="btn-modern">Activar mi cuenta</a>
            </div>

            <p class="text-p" style="font-size: 14px; text-align: center; color: #6b7280;">
                Este enlace de activación es valido por tiempo limitado.
            </p>

            <div class="divider"></div>

            <p class="text-p" style="font-size: 13px; margin-bottom: 10px;">
                Si el boton no funciona, copia y pega este enlace en tu navegador:
            </p>
            <div class="link-alt">
                ${this.escapeHtml(payload.activationLink)}
            </div>
        </div>

        <div class="footer">
            <p><strong>Secretaria Ejecutiva del Sistema Nacional Anticorrupcion</strong><br>
            Ciudad de Mexico, Mexico</p>
            <p style="margin-top: 15px;">
                &copy; 2024 Plataforma Digital Nacional. Todos los derechos reservados.
            </p>
        </div>
    </div>
</body>
</html>
    `;

    const info = await this.deliver({
      from: this.from,
      to: payload.to,
      subject: 'Invitación para activar tu cuenta',
      html,
    });

    this.logger.log(
      `Correo de invitación enviado a ${payload.to}. messageId=${info.messageId}`,
    );
  }

  async sendResetPasswordEmail(payload: ResetPasswordEmailPayload) {
    if (!this.transporter) {
      throw new ServiceUnavailableException(this.status.message);
    }

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Recuperación de Contraseña</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#fff;border:1px solid #eef2f6;border-radius:12px;padding:36px;">
            <h1 style="margin:0 0 20px;color:#1a1a1a;font-size:22px;">Restablecer contraseña</h1>
            <p style="color:#4b5563;line-height:1.6;">Hola <strong>${this.escapeHtml(payload.fullName)}</strong>,</p>
            <p style="color:#4b5563;line-height:1.6;">Recibimos una solicitud para restablecer tu contraseña. Si fuiste tu, usa el siguiente enlace:</p>
            <p style="text-align:center;margin:30px 0;">
              <a href="${this.escapeHtml(payload.resetLink)}" style="background:#7a3e7c;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;display:inline-block;font-weight:600;">
                Restablecer contraseña
              </a>
            </p>
            <p style="font-size:13px;color:#6b7280;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
            <p style="font-size:13px;color:#6b7280;">Enlace directo:</p>
            <div style="background:#f3f4f6;border-radius:6px;padding:12px;word-break:break-all;font-family:monospace;font-size:12px;color:#7a3e7c;">
              ${this.escapeHtml(payload.resetLink)}
            </div>
        </div>
    </div>
</body>
</html>
    `;

    const info = await this.deliver({
      from: this.from,
      to: payload.to,
      subject: 'Recuperación de contraseña',
      html,
    });

    this.logger.log(
      `Correo de recuperación enviado a ${payload.to}. messageId=${info.messageId}`,
    );
  }

  async sendPasswordChangedEmail(payload: PasswordChangedEmailPayload) {
    if (!this.transporter) {
      throw new ServiceUnavailableException(this.status.message);
    }

    const changedAt = payload.changedAt.toLocaleString('es-MX', {
      dateStyle: 'long',
      timeStyle: 'short',
      timeZone: 'America/Mexico_City',
    });
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Contraseña actualizada</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
        <div style="background:#fff;border:1px solid #eef2f6;border-radius:12px;padding:36px;">
            <h1 style="margin:0 0 20px;color:#1a1a1a;font-size:22px;">Tu contraseña fue actualizada</h1>
            <p style="color:#4b5563;line-height:1.6;">Hola <strong>${this.escapeHtml(payload.fullName)}</strong>,</p>
            <p style="color:#4b5563;line-height:1.6;">La contraseña de tu cuenta fue actualizada el ${this.escapeHtml(changedAt)}. Por seguridad, se cerraron todas las sesiones abiertas.</p>
            <p style="font-size:13px;color:#6b7280;">Si no realizaste este cambio, solicita de inmediato un restablecimiento de contraseña y contacta al administrador del sistema.</p>
        </div>
    </div>
</body>
</html>
    `;

    const info = await this.deliver({
      from: this.from,
      to: payload.to,
      subject: 'Tu contraseña fue actualizada',
      html,
    });

    this.logger.log(
      `Aviso de cambio de contraseña enviado a ${payload.to}. messageId=${info.messageId}`,
    );
  }

  private async deliver(
    message: nodemailer.SendMailOptions,
  ): Promise<{ messageId: string }> {
    if (!this.transporter) {
      throw new ServiceUnavailableException(this.status.message);
    }

    try {
      const rawInfo = (await this.transporter.sendMail(message)) as unknown;
      this.status = {
        configured: true,
        available: true,
        message: 'El servicio de correo esta disponible.',
      };
      return { messageId: this.readMessageId(rawInfo) };
    } catch (error: unknown) {
      const userMessage = this.toUserMessage(error);
      this.status = {
        configured: true,
        available: this.isRecipientRejection(error),
        message: userMessage,
      };
      this.logMailError('Error al enviar correo', error);
      throw new ServiceUnavailableException(userMessage);
    }
  }

  private toUserMessage(error: unknown) {
    const mailError = error as MailError;
    const code = String(mailError?.code || '').toUpperCase();
    const responseCode = Number(mailError?.responseCode || 0);

    if (code === 'EAUTH' || responseCode === 535) {
      return 'El servidor SMTP rechazo las credenciales. Revisa MAIL_USER y MAIL_PASS.';
    }

    if (
      [
        'ETIMEDOUT',
        'ESOCKET',
        'ECONNECTION',
        'ECONNREFUSED',
        'ENETUNREACH',
        'EHOSTUNREACH',
      ].includes(code)
    ) {
      return 'No fue posible conectar con el servidor SMTP. Revisa la red, el host y el puerto.';
    }

    if (code === 'EENVELOPE' || [550, 551, 553].includes(responseCode)) {
      return 'El servidor SMTP rechazo la direccion de correo del destinatario.';
    }

    return 'El servidor SMTP no pudo procesar el correo. Revisa su configuracion e intenta nuevamente.';
  }

  private isRecipientRejection(error: unknown) {
    const mailError = error as MailError;
    const code = String(mailError?.code || '').toUpperCase();
    const responseCode = Number(mailError?.responseCode || 0);
    return code === 'EENVELOPE' || [550, 551, 553].includes(responseCode);
  }

  private readMessageId(info: unknown) {
    if (
      typeof info === 'object' &&
      info !== null &&
      'messageId' in info &&
      typeof info.messageId === 'string'
    ) {
      return info.messageId;
    }
    return 'sin-message-id';
  }

  private logMailError(context: string, error: unknown) {
    const mailError = error as MailError;
    const details = [
      mailError?.code,
      mailError?.responseCode,
      mailError?.command,
    ]
      .filter(Boolean)
      .join('/');
    this.logger.error(
      `${context}${details ? ` (${details})` : ''}: ${mailError?.message || String(error)}`,
    );
  }

  private getTimeout(key: string, fallback: number) {
    const configured = Number(this.config.get<string>(key));
    return Number.isFinite(configured) && configured > 0
      ? configured
      : fallback;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
