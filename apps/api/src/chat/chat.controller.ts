import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ChatService } from 'src/chat/chat.service';
import { SendMessageDto } from 'src/chat/dto/send-message.dto';
import { Guild, Permission } from 'generated/client';
import { DiscordId } from 'src/shared/decorators/discord-id.decorator';
import { GuildData } from 'src/shared/decorators/guild-data.decorator';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { Permissions } from 'src/shared/permissions/permissions.decorator';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';

@ApiTags('chat')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('guilds/:guildId/chat-messages')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Permissions(Permission.LOOTLOG_CHAT_READ)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: 'Get chat messages',
    description: 'Retrieve chat messages for a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 200,
    description: 'List of chat messages',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getChatMessages(@GuildData() guild: Guild) {
    return this.chatService.getMessages(guild.id);
  }

  @Permissions(Permission.LOOTLOG_CHAT_WRITE)
  @UseGuards(PermissionsGuard)
  @Post()
  @ApiOperation({
    summary: 'Send chat message',
    description: 'Send a new chat message to a guild',
  })
  @ApiParam({ name: 'guildId', description: 'Guild ID', example: 'guild_123' })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async sendChatMessage(
    @Body() data: SendMessageDto,
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.chatService.sendMessage(discordId, guild.id, data);
  }
}
