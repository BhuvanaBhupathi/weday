import { Controller, Get, Req, Res, UseGuards, HttpCode, Post, Body, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import type { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigService } from '@nestjs/config';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Initiates GitHub OAuth flow.
   * Redirects user to GitHub for authorization.
   */
  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Passport handles the redirect — this body is never reached
  }

  /**
   * GitHub OAuth callback.
   * Exchanges code for token, upserts user, sets JWT cookie.
   */
  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const profile = req.user as Parameters<AuthService['handleGithubCallback']>[0];
    const { token } = await this.authService.handleGithubCallback(profile);

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';

    // Set JWT in HTTP-only cookie — never exposed to frontend JavaScript
    res.cookie('friday_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });

    this.logger.log('GitHub OAuth callback successful, redirecting to frontend workspace');
    res.redirect(`${frontendUrl}/workspace`);
  }

  /**
   * Dev login for local development and testing.
   */
  @Public()
  @Post('dev-login')
  @HttpCode(200)
  async devLogin(
    @Body('username') customUsername: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    if (isProd) {
      return { error: 'Dev login not permitted in production' };
    }
    const username = customUsername || 'developer';
    const { token, user } = await this.authService.devLogin(username);

    res.cookie('friday_token', token, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return { message: 'Logged in as dev user', user };
  }

  /**
   * Returns the currently authenticated user's profile.
   */
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      email: user.email,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }

  /**
   * Logout — clears the JWT cookie.
   */
  @Public()
  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('friday_token', { path: '/' });
    return { message: 'Logged out successfully' };
  }
}
