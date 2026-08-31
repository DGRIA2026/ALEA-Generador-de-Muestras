import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export type UserRole = 'admin' | 'auditor';
export type UserStatus = 'active' | 'pending' | 'inactive';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true })
  email: string;

  // Para tu UI
  @Column({ type: 'varchar', length: 200 })
  fullName: string;

  @Column({ type: 'varchar', length: 50, default: 'auditor' })
  role: UserRole;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: UserStatus;

  @Column({ type: 'varchar', length: 255, default: '' })
  institution: string;

  @Column({ type: 'varchar', length: 100, default: '' })
  institutionAcronym: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  position: string;

  // Auth (no debe salir en queries normales)
  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'integer', default: 0 })
  authVersion: number;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  activationTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  activationTokenExpiresAt: Date | null;

  @Column({ type: 'varchar', length: 128, nullable: true, select: false })
  resetTokenHash: string | null;

  @Column({ type: 'timestamptz', nullable: true, select: false })
  resetTokenExpiresAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  lastLogin: Date | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  lastUploadedFileHash: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  uploadWindowStartedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  uploadWindowEndsAt: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
