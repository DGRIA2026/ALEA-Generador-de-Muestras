import { BadRequestException, Injectable } from '@nestjs/common';
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
    });

    await this.repo.save(record);

    return this.getUsageByFileHash(userId, normalizedFileHash);
  }

  async getFileUploadEligibility(userId: string, fileHash: string) {
    return this.usersService.getFileUploadEligibility(userId, fileHash);
  }

  async getUsageByFileHash(userId: string, fileHash: string) {
    const normalizedFileHash = (fileHash || '').trim();
    const rows = await this.repo.find({
      where: { userId, fileHash: normalizedFileHash },
      order: { timestamp: 'ASC', createdAt: 'ASC' },
    });

    const user = await this.usersService.findById(userId);
    const now = Date.now();
    let count = 0;

    if (user) {
      const activeFileHash = user.lastUploadedFileHash?.trim() || null;
      const windowStartsAt = user.uploadWindowStartedAt;
      const windowEndsAt = user.uploadWindowEndsAt;
      const windowIsActive = !!windowStartsAt && (!!windowEndsAt ? windowEndsAt.getTime() > now : false);

      if (activeFileHash === normalizedFileHash && windowIsActive && windowStartsAt) {
        const windowStartMs = windowStartsAt.getTime();
        count = rows.filter((row) => {
          const rowMs = row.createdAt?.getTime() ?? row.timestamp.getTime();
          return rowMs >= windowStartMs;
        }).length;
      }
    }

    const history = rows.map((row) => this.toHistoryItem(row));
    return {
      count,
      history,
    };
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
    };
  }
}
