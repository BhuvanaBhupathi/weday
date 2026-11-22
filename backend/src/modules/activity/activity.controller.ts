import { Controller, Get, Param, Query } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('bands/:bandId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getBandActivity(
    @Param('bandId') bandId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @CurrentUser('id') _userId: string,
  ) {
    return this.activityService.getBandActivity(bandId, page, limit);
  }
}
