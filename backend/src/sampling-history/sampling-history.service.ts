import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSamplingHistoryDto } from './dto/create-sampling-history.dto';
import { SamplingHistory } from './sampling-history.entity';
import { UsersService } from '../users/users.service';

type SamplingHistoryItem = {
  timestamp: string;
  sampleSize: number;
  seed: string;
  fileHash: string;
  resultHash: string;
  canonicalResultHash?: string;
  method: string;
  algorithm: string;
};

@Injectable()
export class SamplingHistoryService {
  constructor(
    @InjectRepository(SamplingHistory)
    private readonly repo: Repository<SamplingHistory>,
    private readonly usersService: UsersService,
  ) {}

  async createAndGetUsage(userId: string, dto: CreateSamplingHistoryDto) {
    if (!dto?.timestamp || !dto?.seed || !dto?.fileHash || !dto?.resultHash || !dto?.method) {
      throw new BadRequestException('Registro de muestreo incompleto.');
    }

    if (!Number.isInteger(dto.sampleSize) || dto.sampleSize <= 0) {
      throw new BadRequestException('Tamano de muestra invalido.');
    }

    const timestamp = new Date(dto.timestamp);
    if (Number.isNaN(timestamp.getTime())) {
      throw new BadRequestException('Fecha de muestreo invalida.');
    }

    const normalizedFileHash = dto.fileHash.trim();
    await this.usersService.registerFileUploadForUser(userId, normalizedFileHash);

    const record = this.repo.create({
      userId,
      timestamp,
      sampleSize: dto.sampleSize,
      seed: dto.seed.trim(),
      fileHash: normalizedFileHash,
      resultHash: dto.resultHash.trim(),
      canonicalResultHash: dto.canonicalResultHash?.trim() || null,
      method: dto.method.trim(),
      algorithm: dto.algorithm?.trim() || 'FisherYates+PRNG(SHA256)',
    });

    await this.repo.save(record);

    return this.getUsageByFileHash(userId, normalizedFileHash);
  }

  async getFileUploadEligibility(userId: string, fileHash: string) {
    return this.usersService.getFileUploadEligibility(userId, fileHash);
  }

  async getAssociatedFileCount(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    const fileHash = user.lastUploadedFileHash?.trim();
    const count = fileHash
      ? await this.repo.count({ where: { userId, fileHash } })
      : 0;
    return { count };
  }

  async getUsageByFileHash(userId: string, fileHash: string) {
    const normalizedFileHash = (fileHash || '').trim();
    const rows = await this.repo.find({
      where: { userId, fileHash: normalizedFileHash },
      order: { timestamp: 'ASC', createdAt: 'ASC' },
    });

    const history = rows.map((row) => this.toHistoryItem(row));
    return {
      // The usage counter and the displayed history describe the same scope:
      // every sampling saved by this user for the currently loaded file.
      count: history.length,
      history,
    };
  }
async deleteHistoryByUserId(userId: string): Promise<void> {
  await this.repo.delete({
    userId,
  });
}
  private toHistoryItem(row: SamplingHistory): SamplingHistoryItem {
    return {
      timestamp: row.timestamp.toISOString(),
      sampleSize: row.sampleSize,
      seed: row.seed,
      fileHash: row.fileHash,
      resultHash: row.resultHash,
      canonicalResultHash: row.canonicalResultHash || undefined,
      method: row.method,
      algorithm: row.algorithm,
    };
  }
}
