import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity('sampling_history')
@Index(['userId', 'fileHash', 'timestamp'])
export class SamplingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'int' })
  sampleSize: number;

  @Column({ type: 'varchar', length: 256 })
  seed: string;

  @Column({ type: 'varchar', length: 64 })
  fileHash: string;

  @Column({ type: 'varchar', length: 64 })
  resultHash: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  canonicalResultHash: string | null;

  @Column({ type: 'varchar', length: 120 })
  method: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
