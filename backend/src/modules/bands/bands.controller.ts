import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { BandsService } from './bands.service';
import { CreateBandDto } from './dto/create-band.dto';
import { UpdateBandDto } from './dto/update-band.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BandMemberRole } from '@prisma/client';
import { IsEnum } from 'class-validator';
import { IsString, Matches } from 'class-validator';

class JoinBandDto {
  @IsString()
  joinCode!: string;
}

class UpdateMemberRoleDto {
  @IsEnum(BandMemberRole)
  role!: BandMemberRole;
}

class UpdateSignatureColorDto {
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color must be a 6-digit hex color, e.g. #9775fa',
  })
  color!: string;
}

@Controller('bands')
export class BandsController {
  constructor(private readonly bandsService: BandsService) {}

  /** Create a new Band */
  @Post()
  createBand(@CurrentUser() user: User, @Body() dto: CreateBandDto) {
    return this.bandsService.createBand(user.id, dto);
  }

  /** Get all bands the user belongs to */
  @Get('my')
  getMyBands(@CurrentUser('id') userId: string) {
    return this.bandsService.getUserBands(userId);
  }

  /** Join a Band via join code */
  @Post('join')
  joinBand(@CurrentUser('id') userId: string, @Body() dto: JoinBandDto) {
    return this.bandsService.joinByCode(userId, dto.joinCode);
  }

  /** Get a specific Band's details */
  @Get(':bandId')
  getBand(@Param('bandId') bandId: string, @CurrentUser('id') userId: string) {
    return this.bandsService.getBandById(bandId, userId);
  }

  /** Update Band settings (Admin only) */
  @Patch(':bandId')
  updateBand(
    @Param('bandId') bandId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateBandDto,
  ) {
    return this.bandsService.updateBand(bandId, userId, dto);
  }

  /** Get Band members */
  @Get(':bandId/members')
  getMembers(@Param('bandId') bandId: string, @CurrentUser('id') userId: string) {
    return this.bandsService.getBandMembers(bandId, userId);
  }

  /** Update member role (Admin only) */
  @Patch(':bandId/members/:targetUserId/role')
  updateMemberRole(
    @Param('bandId') bandId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.bandsService.updateMemberRole(bandId, userId, targetUserId, dto.role);
  }

  /**
   * Update a member's signature color.
   * A member may change their own color; Band Admins may change any member's.
   */
  @Patch(':bandId/members/:targetUserId/signature-color')
  updateSignatureColor(
    @Param('bandId') bandId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSignatureColorDto,
  ) {
    return this.bandsService.updateSignatureColor(bandId, userId, targetUserId, dto.color);
  }

  /** Remove member from Band (Admin only) */
  @Delete(':bandId/members/:targetUserId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('bandId') bandId: string,
    @Param('targetUserId') targetUserId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.bandsService.removeMember(bandId, userId, targetUserId);
  }

  /** Regenerate join code (Admin only) */
  @Post(':bandId/join-code/regenerate')
  regenerateJoinCode(@Param('bandId') bandId: string, @CurrentUser('id') userId: string) {
    return this.bandsService.regenerateJoinCode(bandId, userId);
  }

  /** Delete Band and all associated resources (Admin only) */
  @Delete(':bandId')
  @HttpCode(HttpStatus.OK)
  deleteBand(@Param('bandId') bandId: string, @CurrentUser('id') userId: string) {
    return this.bandsService.deleteBand(bandId, userId);
  }
}
