import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CrewService } from './crew.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('crew')
export class CrewController {
  constructor(private readonly crewService: CrewService) {}

  @Get()
  async getMyCrew(@CurrentUser() user: User) {
    return this.crewService.getMyCrew(user.id);
  }

  @Get('requests')
  async getRequests(@CurrentUser() user: User) {
    return this.crewService.getPendingRequests(user.id);
  }

  @Post('request')
  async sendRequest(
    @CurrentUser() user: User,
    @Body('username') targetUsername: string,
  ) {
    return this.crewService.sendCrewRequest(user.id, targetUsername);
  }

  @Patch('requests/:relationshipId')
  async respondToRequest(
    @CurrentUser() user: User,
    @Param('relationshipId') relationshipId: string,
    @Body('accept') accept: boolean,
  ) {
    return this.crewService.respondToRequest(user.id, relationshipId, accept);
  }
}
