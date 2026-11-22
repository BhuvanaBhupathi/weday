import { Controller } from '@nestjs/common';
import { BandMembershipService } from './band-membership.service';

@Controller('band-membership')
export class BandMembershipController {
  constructor(private readonly bandMembershipService: BandMembershipService) {}
}
