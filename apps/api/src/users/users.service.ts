import { Injectable, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { TokenExpiredError, AuthServiceUnavailableError } from 'src/auth/errors';
import { PrismaService } from 'src/db/prisma.service';
import { DiscordService } from 'src/discord/discord.service';
import { UpdateUserPreferencesDto } from 'src/users/dto/update-user-preferences.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly authService: AuthService,
  ) {}

  async getUserById(userId: string) {}

  async getUserIdpTokenScopes(userId: string) {
    try {
      const token = await this.authService.getIdpToken(userId);
      if (!token) {
        throw new ServiceUnavailableException('Failed to retrieve IDP token');
      }
      return token.scopes;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException('IDP token has expired. Please reconnect your account.');
      }
      if (error instanceof AuthServiceUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }
      throw error;
    }
  }

  async getUserPreferences(userId: string) {
    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    return (
      userSettings || {
        id: 0,
        userId,
        guildsOrder: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  async updateUserPreferences(
    userId: string,
    preferences: UpdateUserPreferencesDto,
  ) {
    const userSettings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: { ...preferences, updatedAt: new Date() },
      create: { userId, ...preferences },
    });

    return userSettings;
  }
}
