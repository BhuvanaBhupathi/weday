import { Controller, Get, Patch, Body, Param, Query } from '@nestjs/common';
import type { User } from '@prisma/client';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Search users by username/display name.
   * Used for adding crew members, DMs, @mentions.
   */
  @Get('search')
  search(@Query('q') query: string, @CurrentUser('id') userId: string) {
    return this.usersService.searchUsers(query, userId);
  }

  /**
   * Get a user's public profile by username.
   */
  @Get(':username')
  async getProfile(@Param('username') username: string) {
    const user = await this.usersService.findByUsername(username);
    if (!user) return null;
    // Return only public fields
    const { githubToken: _token, ...publicProfile } = user;
    return publicProfile;
  }

  /**
   * Update the authenticated user's own profile.
   */
  @Patch('me')
  updateMyProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
