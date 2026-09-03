import { PermissionsBitField } from "discord.js";

export const REQUIRED_NOTIFICATION_PERMISSIONS = [
  {
    name: "ViewChannel",
    flag: PermissionsBitField.Flags.ViewChannel,
  },
  {
    name: "SendMessages",
    flag: PermissionsBitField.Flags.SendMessages,
  },
  {
    name: "EmbedLinks",
    flag: PermissionsBitField.Flags.EmbedLinks,
  },
  {
    name: "AttachFiles",
    flag: PermissionsBitField.Flags.AttachFiles,
  },
  {
    name: "ReadMessageHistory",
    flag: PermissionsBitField.Flags.ReadMessageHistory,
  },
] as const;
