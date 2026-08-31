import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';

import { getPasswordPolicyViolation } from '../common/password-policy';
import { User } from './user.entity';

const FILE_UPLOAD_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export type FileUploadEligibility = {
  canUpload: boolean;
  requiresNewWindow: boolean;
  message: string;
  activeFileHash: string | null;
  uploadWindowStartedAt: string | null;
  uploadWindowEndsAt: string | null;
};

@Injectable()
export class UsersService {
  private static readonly ACTIVATION_TOKEN_TTL_HOURS = 24;
  private static readonly RESET_TOKEN_TTL_HOURS = 1;

  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  // Crear usuario
  async create(data: Partial<User>): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
  }

  // Buscar por email (SIN passwordHash)
  async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({
      where: { email },
    });
  }

  // Buscar por email CON passwordHash (para login)
  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne();
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  // Buscar por id
  async findById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
    });
  }

  async getFileUploadEligibility(
    userId: string,
    fileHash: string,
  ): Promise<FileUploadEligibility> {
    const normalizedFileHash = this.normalizeFileHash(fileHash);
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    return this.calculateFileUploadEligibility(
      user,
      normalizedFileHash,
      new Date(),
    );
  }

  async registerFileUploadForUser(
    userId: string,
    fileHash: string,
  ): Promise<FileUploadEligibility> {
    const normalizedFileHash = this.normalizeFileHash(fileHash);
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const now = new Date();
    const eligibility = this.calculateFileUploadEligibility(
      user,
      normalizedFileHash,
      now,
    );
    if (!eligibility.canUpload) {
      throw new BadRequestException(eligibility.message);
    }

    if (eligibility.requiresNewWindow) {
      const uploadWindowStartedAt = now;
      const uploadWindowEndsAt = new Date(
        now.getTime() + FILE_UPLOAD_WINDOW_MS,
      );

      await this.repo.update(user.id, {
        lastUploadedFileHash: normalizedFileHash,
        uploadWindowStartedAt,
        uploadWindowEndsAt,
      });

      return {
        canUpload: true,
        requiresNewWindow: false,
        message: 'Archivo autorizado para muestreo.',
        activeFileHash: normalizedFileHash,
        uploadWindowStartedAt: uploadWindowStartedAt.toISOString(),
        uploadWindowEndsAt: uploadWindowEndsAt.toISOString(),
      };
    }

    return eligibility;
  }

  // Obtener todos los usuarios (para el panel admin)
  async findAll(): Promise<User[]> {
    return this.repo.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  // Actualizar ultimo login
  async updateLastLogin(id: string): Promise<void> {
    await this.repo.update(id, {
      lastLogin: new Date(),
    });
  }

  // Contar usuarios (para seed admin)
  async count(): Promise<number> {
    return this.repo.count();
  }

  async inviteUser(data: {
    fullName: string;
    email: string;
    role: 'admin' | 'auditor';
    institution: string;
    institutionAcronym: string;
    position: string;
  }): Promise<{ user: User; activationToken: string }> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const existing = await this.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese correo.');
    }

    const tempPasswordHash = await bcrypt.hash(randomUUID(), 10);
    const { token, tokenHash, expiresAt } = this.issueActivationToken();

    const user = this.repo.create({
      email: normalizedEmail,
      fullName: data.fullName.trim(),
      role: data.role,
      institution: data.institution.trim(),
      institutionAcronym: data.institutionAcronym.trim(),
      position: data.position.trim(),
      status: 'pending',
      passwordHash: tempPasswordHash,
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: expiresAt,
      lastUploadedFileHash: null,
      uploadWindowStartedAt: null,
      uploadWindowEndsAt: null,
    });

    try {
      const saved = await this.repo.save(user);
      return { user: saved, activationToken: token };
    } catch (error: unknown) {
      this.rethrowUserPersistenceError(error);
    }
  }

  async resendInvite(email: string): Promise<{
    user: User;
    activationToken: string;
    activationTokenHash: string;
    activationTokenExpiresAt: Date;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (user.status !== 'pending') {
      throw new BadRequestException(
        'Solo se puede reenviar invitación a usuarios pendientes.',
      );
    }

    const { token, tokenHash, expiresAt } = this.issueActivationToken();

    return {
      user,
      activationToken: token,
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: expiresAt,
    };
  }

  async commitInvitationToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    await this.repo.update(userId, {
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: expiresAt,
    });
  }

  async activateAccount(token: string, password: string): Promise<User> {
    this.assertPasswordPolicy(password);
    const tokenHash = this.hashActivationToken(token);

    const user = await this.repo
      .createQueryBuilder('user')
      .addSelect('user.activationTokenHash')
      .addSelect('user.activationTokenExpiresAt')
      .where('user.activationTokenHash = :tokenHash', { tokenHash })
      .getOne();

    if (
      !user ||
      !user.activationTokenExpiresAt ||
      user.activationTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'El enlace de activación es inválido o expiro.',
      );
    }

    if (user.status !== 'pending') {
      throw new BadRequestException(
        'La cuenta ya no esta en estado pendiente.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.repo.update(user.id, {
      passwordHash,
      status: 'active',
      activationTokenHash: null,
      activationTokenExpiresAt: null,
    });

    const updated = await this.findById(user.id);
    if (!updated) {
      throw new NotFoundException('No se pudo actualizar el usuario.');
    }
    return updated;
  }

  async updateUser(
    id: string,
    data: {
      fullName: string;
      email: string;
      role: 'admin' | 'auditor';
      institution: string;
      institutionAcronym: string;
      position: string;
    },
  ): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const normalizedEmail = data.email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const existing = await this.findByEmail(normalizedEmail);
      if (existing && existing.id !== id) {
        throw new ConflictException('Ya existe un usuario con ese correo.');
      }
    }

    try {
      await this.repo.update(id, {
        fullName: data.fullName.trim(),
        email: normalizedEmail,
        role: data.role,
        institution: data.institution.trim(),
        institutionAcronym: data.institutionAcronym.trim(),
        position: data.position.trim(),
      });
    } catch (error: unknown) {
      this.rethrowUserPersistenceError(error);
    }

    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('No se pudo actualizar el usuario.');
    }
    return updated;
  }

  async deleteUser(id: string, actorUserId: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }
    if (user.id === actorUserId) {
      throw new BadRequestException('No puedes eliminar tu propia cuenta.');
    }
    if (user.role === 'admin') {
      const adminsCount = await this.repo.count({ where: { role: 'admin' } });
      if (adminsCount <= 1) {
        throw new BadRequestException(
          'No se puede eliminar el ultimo administrador.',
        );
      }
    }

    await this.repo.delete(id);
  }

  async reactivateFileUpload(userId: string): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    await this.repo.update(user.id, {
      lastUploadedFileHash: null,
      uploadWindowStartedAt: null,
      uploadWindowEndsAt: null,
    });

    const updated = await this.findById(user.id);
    if (!updated) {
      throw new NotFoundException('No se pudo actualizar el usuario.');
    }
    return updated;
  }

  async issuePasswordReset(email: string): Promise<{
    user: User;
    token: string;
    tokenHash: string;
    expiresAt: Date;
  } | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.findByEmail(normalizedEmail);
    if (!user || user.status !== 'active') {
      return null;
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(
      Date.now() + UsersService.RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    return { user, token, tokenHash, expiresAt };
  }

  async commitPasswordResetToken(
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    await this.repo.update(userId, {
      resetTokenHash: tokenHash,
      resetTokenExpiresAt: expiresAt,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    this.assertPasswordPolicy(password);
    const tokenHash = this.hashToken(token);
    const user = await this.repo
      .createQueryBuilder('user')
      .addSelect('user.resetTokenHash')
      .addSelect('user.resetTokenExpiresAt')
      .where('user.resetTokenHash = :tokenHash', { tokenHash })
      .getOne();

    if (
      !user ||
      !user.resetTokenExpiresAt ||
      user.resetTokenExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException(
        'El enlace para restablecer contraseña es invalido o expiro.',
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await this.repo.update(user.id, {
      passwordHash,
      authVersion: (user.authVersion ?? 0) + 1,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<User> {
    this.assertPasswordPolicy(newPassword);

    const user = await this.findByIdWithPassword(userId);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const currentPasswordMatches = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );
    if (!currentPasswordMatches) {
      throw new BadRequestException('La contraseña actual es incorrecta.');
    }

    const reusesCurrentPassword = await bcrypt.compare(
      newPassword,
      user.passwordHash,
    );
    if (reusesCurrentPassword) {
      throw new BadRequestException(
        'La nueva contraseña debe ser diferente de la contraseña actual.',
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.repo.update(user.id, {
      passwordHash,
      authVersion: (user.authVersion ?? 0) + 1,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });

    const updated = await this.findById(user.id);
    if (!updated) {
      throw new NotFoundException('No se pudo actualizar el usuario.');
    }
    return updated;
  }

  async seedInitialAdminFromEnv(data: {
    email?: string | null;
    password?: string | null;
    fullName?: string | null;
    institution?: string | null;
    institutionAcronym?: string | null;
    position?: string | null;
  }): Promise<boolean> {
    const usersCount = await this.count();
    if (usersCount > 0) return false;

    const email = (data.email || '').trim().toLowerCase();
    const password = data.password || '';

    if (!email || !password) {
      throw new BadRequestException(
        'No hay usuarios en la base de datos. Define SEED_ADMIN_EMAIL y SEED_ADMIN_PASSWORD para crear el admin inicial.',
      );
    }

    this.assertPasswordPolicy(password);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = this.repo.create({
      email,
      fullName: (data.fullName || 'Administrador Inicial').trim(),
      role: 'admin',
      status: 'active',
      institution: (data.institution || '').trim(),
      institutionAcronym: (data.institutionAcronym || '').trim(),
      position: (data.position || '').trim(),
      passwordHash,
      activationTokenHash: null,
      activationTokenExpiresAt: null,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
      lastLogin: null,
      lastUploadedFileHash: null,
      uploadWindowStartedAt: null,
      uploadWindowEndsAt: null,
    });

    await this.repo.save(user);
    return true;
  }

  private issueActivationToken() {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashActivationToken(token);
    const expiresAt = new Date(
      Date.now() + UsersService.ACTIVATION_TOKEN_TTL_HOURS * 60 * 60 * 1000,
    );

    return { token, tokenHash, expiresAt };
  }

  private hashActivationToken(token: string) {
    return this.hashToken(token);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private assertPasswordPolicy(password: string) {
    const policyViolation = getPasswordPolicyViolation(password);
    if (policyViolation) {
      throw new BadRequestException(policyViolation);
    }
  }

  private rethrowUserPersistenceError(error: unknown): never {
    if (error instanceof QueryFailedError) {
      const driverError = error.driverError as { code?: string };
      if (driverError?.code === '22001') {
        throw new BadRequestException(
          'Uno de los campos excede el tamaño permitido. La institución y el cargo admiten hasta 255 caracteres; las siglas, hasta 100.',
        );
      }
    }
    throw error;
  }

  private normalizeFileHash(fileHash: string): string {
    const normalized = (fileHash || '').trim();
    if (!normalized) {
      throw new BadRequestException('Hash de archivo invalido.');
    }
    return normalized;
  }

  private calculateFileUploadEligibility(
    user: User,
    fileHash: string,
    now: Date,
  ): FileUploadEligibility {
    const activeFileHash = user.lastUploadedFileHash?.trim() || null;
    const uploadWindowStartedAt = user.uploadWindowStartedAt || null;
    const uploadWindowEndsAt = user.uploadWindowEndsAt || null;

    if (!activeFileHash) {
      return {
        canUpload: true,
        requiresNewWindow: true,
        message: 'Carga disponible para un nuevo archivo.',
        activeFileHash: null,
        uploadWindowStartedAt: null,
        uploadWindowEndsAt: null,
      };
    }

    const windowIsActive =
      !!uploadWindowEndsAt && uploadWindowEndsAt.getTime() > now.getTime();

    if (!windowIsActive) {
      return {
        canUpload: true,
        requiresNewWindow: true,
        message:
          activeFileHash === fileHash
            ? 'La ventana de carga anterior ya vencio. Puedes iniciar una nueva ventana con este mismo archivo.'
            : 'La ventana de carga anterior ya vencio. Puedes cargar un nuevo archivo.',
        activeFileHash,
        uploadWindowStartedAt: uploadWindowStartedAt?.toISOString() || null,
        uploadWindowEndsAt: uploadWindowEndsAt?.toISOString() || null,
      };
    }

    if (activeFileHash === fileHash) {
      return {
        canUpload: true,
        requiresNewWindow: false,
        message: 'El archivo ya esta autorizado para este usuario.',
        activeFileHash,
        uploadWindowStartedAt: uploadWindowStartedAt?.toISOString() || null,
        uploadWindowEndsAt: uploadWindowEndsAt?.toISOString() || null,
      };
    }

    return {
      canUpload: false,
      requiresNewWindow: false,
      message: `Solo puedes cargar 1 archivo cada 30 dias. Podras cargar otro archivo despues de ${uploadWindowEndsAt.toISOString()}.`,
      activeFileHash,
      uploadWindowStartedAt: uploadWindowStartedAt?.toISOString() || null,
      uploadWindowEndsAt: uploadWindowEndsAt.toISOString(),
    };
  }
}
