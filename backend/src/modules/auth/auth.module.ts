import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GitHubOAuthStrategy } from './strategies/github-oauth.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { BandsModule } from '../bands/bands.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
          issuer: 'friday',
          audience: 'friday-web',
        },
      }),
    }),
    UsersModule,
    BandsModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, GitHubOAuthStrategy, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
