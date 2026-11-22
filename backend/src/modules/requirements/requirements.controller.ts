import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { RequirementsService } from './requirements.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';
import { RequirementStatus } from '@prisma/client';

@Controller('bands/:bandId/requirements')
export class RequirementsController {
  constructor(private readonly requirementsService: RequirementsService) {}

  @Get()
  getBandRequirements(
    @Param('bandId') bandId: string,
    @Query('status') status?: RequirementStatus,
    @Query('search') search?: string,
  ) {
    return this.requirementsService.getBandRequirements(bandId, status, search);
  }

  @Get(':reqId')
  getRequirement(
    @Param('bandId') bandId: string,
    @Param('reqId') reqId: string,
  ) {
    return this.requirementsService.getRequirement(bandId, reqId);
  }

  @Post()
  createRequirement(
    @Param('bandId') bandId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateRequirementDto,
  ) {
    return this.requirementsService.createRequirement(bandId, userId, dto);
  }

  @Patch(':reqId')
  updateRequirement(
    @Param('bandId') bandId: string,
    @Param('reqId') reqId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.requirementsService.updateRequirement(bandId, reqId, userId, dto);
  }

  @Delete(':reqId')
  deleteRequirement(
    @Param('bandId') bandId: string,
    @Param('reqId') reqId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.requirementsService.deleteRequirement(bandId, reqId, userId);
  }
}
