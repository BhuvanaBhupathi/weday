import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { PublicationService } from './publication.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  UpdatePublicationDto,
  PublishVersionDto,
  VerifyPasswordDto,
  ClientSubmitCrDto,
} from './dto/publication.dto';

@Controller()
export class PublicationController {
  constructor(private readonly publicationService: PublicationService) {}

  // ─── Band Admin Endpoints ──────────────────────────────────────────────────

  @Get('bands/:bandId/publication')
  async getPublication(@Param('bandId') bandId: string) {
    return this.publicationService.getPublication(bandId);
  }

  @Patch('bands/:bandId/publication')
  async updatePublication(
    @Param('bandId') bandId: string,
    @Body() dto: UpdatePublicationDto,
  ) {
    return this.publicationService.updatePublication(bandId, dto);
  }

  @Post('bands/:bandId/publication/publish')
  async publishSnapshot(
    @Param('bandId') bandId: string,
    @CurrentUser() user: User,
    @Body() dto: PublishVersionDto,
  ) {
    return this.publicationService.publishSnapshot(bandId, user.id, dto);
  }

  // ─── Public Client Portal Endpoints ────────────────────────────────────────

  @Public()
  @Get('public/client/:slug')
  async getPublicSnapshot(@Param('slug') slug: string) {
    return this.publicationService.getPublicSnapshot(slug);
  }

  @Public()
  @Post('public/client/:slug/verify-password')
  async verifyPassword(
    @Param('slug') slug: string,
    @Body() dto: VerifyPasswordDto,
  ) {
    return this.publicationService.verifyPassword(slug, dto.password);
  }

  @Public()
  @Post('public/client/:slug/change-requests')
  async submitClientChangeRequest(
    @Param('slug') slug: string,
    @Body() dto: ClientSubmitCrDto,
  ) {
    return this.publicationService.submitClientChangeRequest(slug, dto);
  }
}
