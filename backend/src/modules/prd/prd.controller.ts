import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Logger,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrdService } from './prd.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreatePrdDto } from './dto/create-prd.dto';
import { UpdatePrdDto } from './dto/update-prd.dto';

@Controller('bands/:bandId/prd')
export class PrdController {
  private readonly logger = new Logger(PrdController.name);

  constructor(private readonly prdService: PrdService) {}

  @Get()
  async getPrd(@Param('bandId') bandId: string) {
    return this.prdService.getPrd(bandId);
  }

  @Post('versions')
  async saveVersion(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdatePrdDto,
  ) {
    return this.prdService.savePrdVersion(bandId, user.id, dto);
  }

  @Get('versions')
  async getVersions(@Param('bandId') bandId: string) {
    return this.prdService.getPrdVersions(bandId);
  }

  @Get('versions/:versionId')
  async getVersion(
    @Param('bandId') bandId: string,
    @Param('versionId') versionId: string,
  ) {
    return this.prdService.getPrdVersion(bandId, versionId);
  }
}
