import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SamplingHistory } from './sampling-history.entity';
import { SamplingHistoryController } from './sampling-history.controller';
import { SamplingHistoryService } from './sampling-history.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SamplingHistory]),
    forwardRef(() => UsersModule),
  ],
  controllers: [SamplingHistoryController],
  providers: [SamplingHistoryService],
  exports: [SamplingHistoryService],
})
export class SamplingHistoryModule {}