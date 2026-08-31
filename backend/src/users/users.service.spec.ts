import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';
import { BadRequestException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

describe('UsersService', () => {
  let service: UsersService;
  const queryBuilder = {
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const repository = {
    count: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    create: jest.fn((input) => input),
    save: jest.fn(),
    createQueryBuilder: jest.fn(() => queryBuilder),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repository.save.mockImplementation(async (user) => user);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repository },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('crea la invitacion con institución, siglas y puesto en su campo correcto', async () => {
    const input = {
      email: 'nuevo@example.com',
      fullName: 'Usuario nuevo',
      role: 'auditor' as const,
      institution: 'Secretaría Ejecutiva del Sistema Nacional Anticorrupción',
      institutionAcronym: 'SESNA',
      position:
        'Jefe de Departamento de Calidad de Software y Procesos Institucionales',
    };
    repository.findOne.mockResolvedValue(null);
    repository.save.mockImplementation(async (user) => ({
      ...user,
      id: 'user-invitado',
    }));

    const result = await service.inviteUser(input);

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: input.email,
        fullName: input.fullName,
        role: input.role,
        institution: input.institution,
        institutionAcronym: 'SESNA',
        position: input.position,
        status: 'pending',
      }),
    );
    expect(result.user).toMatchObject({
      id: 'user-invitado',
      institution: input.institution,
      institutionAcronym: 'SESNA',
      position: input.position,
    });
  });

  it('convierte el error de longitud de PostgreSQL en una respuesta 400 entendible', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.save.mockRejectedValue(
      new QueryFailedError(
        'INSERT INTO users',
        [],
        Object.assign(new Error('value too long'), { code: '22001' }),
      ),
    );

    const invitation = service.inviteUser({
      email: 'nuevo@example.com',
      fullName: 'Usuario nuevo',
      role: 'auditor',
      institution: 'Institución válida',
      institutionAcronym: 'SESNA',
      position: 'Puesto válido',
    });

    await expect(invitation).rejects.toBeInstanceOf(BadRequestException);
    await expect(invitation).rejects.toThrow(
      'Uno de los campos excede el tamaño permitido.',
    );
  });

  it('no reemplaza el token de invitacion hasta confirmar el envio', async () => {
    repository.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'pendiente@example.com',
      status: 'pending',
    } as User);

    const prepared = await service.resendInvite('pendiente@example.com');

    expect(repository.update).not.toHaveBeenCalled();

    await service.commitInvitationToken(
      prepared.user.id,
      prepared.activationTokenHash,
      prepared.activationTokenExpiresAt,
    );

    expect(repository.update).toHaveBeenCalledWith('user-1', {
      activationTokenHash: prepared.activationTokenHash,
      activationTokenExpiresAt: prepared.activationTokenExpiresAt,
    });
  });

  it('no guarda el token de recuperacion hasta confirmar el envio', async () => {
    repository.findOne.mockResolvedValue({
      id: 'user-2',
      email: 'activo@example.com',
      status: 'active',
    } as User);

    const prepared = await service.issuePasswordReset('activo@example.com');

    expect(prepared).not.toBeNull();
    expect(repository.update).not.toHaveBeenCalled();

    await service.commitPasswordResetToken(
      prepared!.user.id,
      prepared!.tokenHash,
      prepared!.expiresAt,
    );

    expect(repository.update).toHaveBeenCalledWith('user-2', {
      resetTokenHash: prepared!.tokenHash,
      resetTokenExpiresAt: prepared!.expiresAt,
    });
  });

  it('cambia la contraseña, limpia tokens y revoca sesiones', async () => {
    const passwordHash = await bcrypt.hash('Actual123', 10);
    jest.spyOn(service, 'findByIdWithPassword').mockResolvedValue({
      id: 'user-3',
      email: 'activo@example.com',
      fullName: 'Usuario activo',
      passwordHash,
      authVersion: 2,
    } as User);
    repository.findOne.mockResolvedValue({
      id: 'user-3',
      email: 'activo@example.com',
      fullName: 'Usuario activo',
      authVersion: 3,
    } as User);

    await service.changePassword('user-3', 'Actual123', 'NuevaClave123');

    expect(repository.update).toHaveBeenCalledWith('user-3', {
      passwordHash: expect.any(String),
      authVersion: 3,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
    const update = repository.update.mock.calls[0][1];
    await expect(
      bcrypt.compare('NuevaClave123', update.passwordHash),
    ).resolves.toBe(true);
  });

  it('rechaza una contraseña actual incorrecta sin actualizar', async () => {
    const passwordHash = await bcrypt.hash('Actual123', 10);
    jest.spyOn(service, 'findByIdWithPassword').mockResolvedValue({
      id: 'user-4',
      passwordHash,
      authVersion: 0,
    } as User);

    await expect(
      service.changePassword('user-4', 'Incorrecta', 'NuevaClave123'),
    ).rejects.toThrow('La contraseña actual es incorrecta.');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rechaza reutilizar la contraseña actual', async () => {
    const passwordHash = await bcrypt.hash('Actual123', 10);
    jest.spyOn(service, 'findByIdWithPassword').mockResolvedValue({
      id: 'user-5',
      passwordHash,
      authVersion: 0,
    } as User);

    await expect(
      service.changePassword('user-5', 'Actual123', 'Actual123'),
    ).rejects.toThrow(
      'La nueva contraseña debe ser diferente de la contraseña actual.',
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas nuevas fuera de la política', async () => {
    await expect(
      service.changePassword('user-6', 'Actual123', 'corta'),
    ).rejects.toThrow('La contraseña debe tener al menos 8 caracteres.');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rechaza contraseñas que exceden el limite de bcrypt', async () => {
    await expect(
      service.changePassword('user-6', 'Actual123', 'á'.repeat(40)),
    ).rejects.toThrow('La contraseña no puede exceder 72 bytes.');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rechaza cambiar la contraseña de un usuario inexistente', async () => {
    jest.spyOn(service, 'findByIdWithPassword').mockResolvedValue(null);

    await expect(
      service.changePassword('missing', 'Actual123', 'NuevaClave123'),
    ).rejects.toThrow('Usuario no encontrado.');
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('revoca sesiones al restablecer la contraseña con un token', async () => {
    queryBuilder.getOne.mockResolvedValue({
      id: 'user-7',
      authVersion: 4,
      resetTokenExpiresAt: new Date(Date.now() + 60_000),
    } as User);

    await service.resetPassword('valid-token', 'NuevaClave123');

    expect(repository.update).toHaveBeenCalledWith('user-7', {
      passwordHash: expect.any(String),
      authVersion: 5,
      resetTokenHash: null,
      resetTokenExpiresAt: null,
    });
  });

  it.each([
    ['corta', 'La contraseña debe tener al menos 8 caracteres.'],
    ['á'.repeat(40), 'La contraseña no puede exceder 72 bytes.'],
  ])(
    'rechaza una contraseña inicial fuera de la politica antes de usar bcrypt',
    async (password, expectedMessage) => {
      repository.count.mockResolvedValue(0);

      await expect(
        service.seedInitialAdminFromEnv({
          email: 'admin@example.com',
          password,
        }),
      ).rejects.toThrow(expectedMessage);
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
});
