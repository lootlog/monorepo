import { Injectable } from '@nestjs/common';
import { AuthService } from 'src/auth/auth.service';
import { PrismaService } from 'src/db/prisma.service';
import { DiscordService } from 'src/discord/discord.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discordService: DiscordService,
    private readonly authService: AuthService,
  ) {}

  async getUserById(userId: string) {}

  async getUserIdpTokenScopes(userId: string) {
    const token = await this.authService.getIdpToken(userId);
    if (!token) {
      throw new Error('Failed to retrieve IDP token');
    }
    return token.scopes;
  }
}
