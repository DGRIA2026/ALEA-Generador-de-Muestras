import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateSamplingHistoryDto } from './dto/create-sampling-history.dto';
import { SamplingHistoryService } from './sampling-history.service';

@UseGuards(JwtAuthGuard)
@Controller('sampling-history')
export class SamplingHistoryController {
  constructor(private readonly samplingHistory: SamplingHistoryService) {}

  @Post('upload-eligibility')
  async getFileUploadEligibility(@Req() req: any, @Body('fileHash') fileHash: string) {
    return this.samplingHistory.getFileUploadEligibility(req.user.id, fileHash);
  }

  @Get(':fileHash')
  async getUsageByFileHash(@Req() req: any, @Param('fileHash') fileHash: string) {
    return this.samplingHistory.getUsageByFileHash(req.user.id, fileHash);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateSamplingHistoryDto) {
    return this.samplingHistory.createAndGetUsage(req.user.id, dto);
  }
}
