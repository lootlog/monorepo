import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard, DiscordId } from "@lootlog/nest-shared";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { ChatService } from "src/chat/chat.service";
import { SendMessageDto } from "src/chat/dto/send-message.dto";
import { UpdateMessageDto } from "src/chat/dto/update-message.dto";
import { type Guild, Permission } from "src/generated/prisma/client";
import { GuildData } from "src/shared/decorators/guild-data.decorator";
import { Permissions } from "src/shared/permissions/permissions.decorator";
import { PermissionsGuard } from "src/shared/permissions/permissions.guard";

@ApiTags("chat")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("guilds/:guildId/chat-messages")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Permissions(Permission.LOOTLOG_CHAT_READ)
  @UseGuards(PermissionsGuard)
  @Get()
  @ApiOperation({
    summary: "Get chat messages",
    description: "Retrieve chat messages for a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiResponse({
    status: 200,
    description: "List of chat messages",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  getChatMessages(@DiscordId() discordId: string, @GuildData() guild: Guild) {
    return this.chatService.getMessages(discordId, guild.id);
  }

  @Permissions(Permission.LOOTLOG_CHAT_WRITE)
  @UseGuards(PermissionsGuard)
  @Post()
  @ApiOperation({
    summary: "Send chat message",
    description: "Send a new chat message to a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiResponse({
    status: 201,
    description: "Message sent successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  sendChatMessage(
    @Body() data: SendMessageDto,
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
  ) {
    return this.chatService.sendMessage(discordId, guild.id, data);
  }

  @Permissions(Permission.LOOTLOG_CHAT_WRITE)
  @UseGuards(PermissionsGuard)
  @Patch(":messageId")
  @ApiOperation({
    summary: "Update chat message",
    description: "Update the content of a chat message",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "messageId",
    description: "Message ID",
    example: "msg_123",
  })
  @ApiResponse({
    status: 200,
    description: "Message updated successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions or not message owner",
  })
  updateChatMessage(
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
    @Param("messageId") messageId: string,
    @Body() dto: UpdateMessageDto,
  ) {
    return this.chatService.updateMessage(
      discordId,
      guild.id,
      messageId,
      dto.message,
    );
  }

  @Permissions(Permission.LOOTLOG_CHAT_WRITE)
  @UseGuards(PermissionsGuard)
  @Delete(":messageId")
  @ApiOperation({
    summary: "Delete chat message",
    description: "Delete a chat message from a guild",
  })
  @ApiParam({ name: "guildId", description: "Guild ID", example: "guild_123" })
  @ApiParam({
    name: "messageId",
    description: "Message ID",
    example: "msg_123",
  })
  @ApiResponse({
    status: 200,
    description: "Message deleted successfully",
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions or not message owner",
  })
  deleteChatMessage(
    @GuildData() guild: Guild,
    @DiscordId() discordId: string,
    @Param("messageId") messageId: string,
  ) {
    return this.chatService.deleteMessage(discordId, guild.id, messageId);
  }
}
