import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { MailModule } from '../mail/mail.module';
import { SamplingHistoryModule } from '../sampling-history/sampling-history.module';
import { Module, forwardRef } from '@nestjs/common';
@Module({
  imports: [TypeOrmModule.forFeature([User]),MailModule,forwardRef(() => SamplingHistoryModule),],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
