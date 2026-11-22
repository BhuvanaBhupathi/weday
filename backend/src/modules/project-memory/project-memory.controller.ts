import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import { ArtifactType } from '@prisma/client';
import { ProjectMemoryService, type LinkArtifactsInput } from './project-memory.service';

@Controller('bands/:bandId/memory')
export class ProjectMemoryController {
  constructor(private readonly projectMemoryService: ProjectMemoryService) {}

  @Get('summary')
  async getSummary(@Param('bandId') bandId: string) {
    return this.projectMemoryService.getBandTraceabilitySummary(bandId);
  }

  @Get('chain')
  async getChain(
    @Param('bandId') bandId: string,
    @Query('type') type: ArtifactType,
    @Query('id') id: string,
  ) {
    return this.projectMemoryService.getArtifactChain(bandId, type, id);
  }

  @Post('link')
  async linkArtifacts(
    @Param('bandId') bandId: string,
    @Body() input: LinkArtifactsInput,
  ) {
    return this.projectMemoryService.linkArtifacts(bandId, input);
  }
}
