import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import type { GitHubProfile } from '../auth.service';

@Injectable()
export class GitHubOAuthStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.get<string>('GITHUB_CLIENT_ID') || 'dev_placeholder_client_id',
      clientSecret: config.get<string>('GITHUB_CLIENT_SECRET') || 'dev_placeholder_client_secret',
      callbackURL: `${config.get<string>('BACKEND_URL', 'http://localhost:4000')}/api/auth/github/callback`,
      scope: ['read:user', 'user:email'],
    });

    // Custom userProfile to safely handle accounts with private/unverified emails or app permission constraints
    const defaultUserProfile = this.userProfile.bind(this);
    this.userProfile = function (accessToken: string, done: (err: any, profile?: any) => void) {
      // First fetch standard profile
      (this as any)._oauth2.get(
        (this as any)._userProfileURL,
        accessToken,
        (err: any, body: any) => {
          if (err) {
            return done(err);
          }
          try {
            const json = JSON.parse(body);
            const profile: any = {
              provider: 'github',
              id: String(json.id),
              username: json.login,
              displayName: json.name || json.login,
              profileUrl: json.html_url,
              emails: json.email ? [{ value: json.email }] : [],
              photos: json.avatar_url ? [{ value: json.avatar_url }] : [],
              _raw: body,
              _json: json,
            };

            // Attempt to get emails, but do not fail if the endpoint returns 404/403 or empty
            (this as any)._oauth2.get(
              (this as any)._userEmailURL,
              accessToken,
              (emailErr: any, emailBody: any) => {
                if (!emailErr && emailBody) {
                  try {
                    const emailsJson = JSON.parse(emailBody);
                    if (Array.isArray(emailsJson)) {
                      const primary = emailsJson.find((e: any) => e.primary);
                      if (primary && primary.email) {
                        profile.emails = [{ value: primary.email }];
                      } else if (emailsJson.length > 0 && emailsJson[0].email) {
                        profile.emails = [{ value: emailsJson[0].email }];
                      }
                    }
                  } catch {
                    // Ignore email parsing error
                  }
                }
                done(null, profile);
              },
            );
          } catch (parseErr) {
            done(parseErr);
          }
        },
      );
    };
  }

  /**
   * Called by Passport after GitHub returns the user profile.
   * We pass the full profile + access token to the controller.
   */
  validate(
    accessToken: string,
    _refreshToken: string,
    profile: {
      id: string;
      username: string;
      displayName: string;
      emails?: Array<{ value: string }>;
      photos?: Array<{ value: string }>;
    },
    done: (error: null, user: GitHubProfile) => void,
  ): void {
    done(null, {
      id: profile.id,
      username: profile.username,
      displayName: profile.displayName,
      emails: profile.emails,
      photos: profile.photos,
      accessToken,
    });
  }
}
