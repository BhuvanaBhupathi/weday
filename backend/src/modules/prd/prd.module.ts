import { Module } from '@nestjs/common';
import { PrdController } from './prd.controller';
import { PrdService } from './prd.service';
import { ActivityModule } from '../activity/activity.module';

@Module({
  imports: [ActivityModule],
  controllers: [PrdController],
  providers: [PrdService],
  exports: [PrdService],
})
export class PrdModule {}
