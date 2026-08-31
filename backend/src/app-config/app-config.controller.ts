import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AppConfigService } from './app-config.service';
import { UpdateSamplingColumnsDto } from './dto/update-sampling-columns.dto';
import { UpdateSupportContactDto } from './dto/update-support-contact.dto';

@UseGuards(JwtAuthGuard)
@Controller('app-config')
export class AppConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get('sampling-columns')
  async getSamplingColumns() {
    return this.appConfig.getSamplingColumns();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put('sampling-columns')
  async updateSamplingColumns(@Body() dto: UpdateSamplingColumnsDto) {
    return this.appConfig.updateSamplingColumns(dto);
  }

  @Get('support-contact')
  async getSupportContact() {
    return this.appConfig.getSupportContact();
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put('support-contact')
  async updateSupportContact(@Body() dto: UpdateSupportContactDto) {
    return this.appConfig.updateSupportContact(dto);
  }
}
