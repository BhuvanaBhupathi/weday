import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { ConcernStatus } from '@prisma/client';
import { ConcernsService } from './concerns.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateConcernDto, UpdateConcernStatusDto } from './dto/concern.dto';

@Controller('bands/:bandId/concerns')
export class ConcernsController {
  constructor(private readonly concernsService: ConcernsService) {}

  @Get()
  async getConcerns(
    @Param('bandId') bandId: string,
    @Query('status') status?: ConcernStatus,
  ) {
    return this.concernsService.getBandConcerns(bandId, status);
  }

  @Post()
  async createConcern(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: CreateConcernDto,
  ) {
    return this.concernsService.createConcern(bandId, user.id, dto);
  }

  @Patch(':concernId/status')
  async updateStatus(
    @Param('concernId') concernId: string,
    @CurrentUser() user: User,
    @Body() dto: UpdateConcernStatusDto,
  ) {
    return this.concernsService.updateStatus(concernId, user.id, dto);
  }
}
