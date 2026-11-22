import { Module } from '@nestjs/common';
import { BandMembershipController } from './band-membership.controller';
import { BandMembershipService } from './band-membership.service';

@Module({
  controllers: [BandMembershipController],
  providers: [BandMembershipService],
  exports: [BandMembershipService],
})
export class BandMembershipModule {}
