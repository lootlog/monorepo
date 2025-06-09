import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // async getUserById(userId: string) {
  //   const user = await this.prisma.user.findUnique({
  //     where: {
  //       id: userId,
  //     },
  //   });

  //   return user;
  // }

  // async createUser(discordUser: User) {
  //   const user = await this.prisma.user.create({
  //     data: {
  //       id: discordUser.id,
  //       username: discordUser.username,
  //       discriminator: discordUser.discriminator,
  //       avatar: this.getUserAvatarURL(discordUser),
  //       banner: discordUser.banner,
  //       globalName: discordUser.global_name,
  //     },
  //   });

  //   return user;
  // }

  // async bulkCreateUsers(users: User[]) {
  //   const userRecords = users.map((user) => ({
  //     id: user.id,
  //     username: user.username,
  //     discriminator: user.discriminator,
  //     avatar: this.getUserAvatarURL(user),
  //     email: user.email,
  //     banner: user.banner,
  //     globalName: user.global_name,
  //   }));

  //   const createdUsers = await this.prisma.user.createMany({
  //     data: userRecords,
  //     skipDuplicates: true,
  //   });

  //   return createdUsers;
  // }

  // async createOrUpdateUser(discordUser: User) {
  //   const user = await this.getUserById(discordUser.id);

  //   if (!user) {
  //     return this.createUser(discordUser);
  //   }

  //   const updatedUser = await this.prisma.user.update({
  //     where: {
  //       id: discordUser.id,
  //     },
  //     data: {
  //       username: discordUser.username,
  //       discriminator: discordUser.discriminator,
  //       avatar: this.getUserAvatarURL(discordUser),
  //       banner: discordUser.banner,
  //       globalName: discordUser.global_name,
  //     },
  //   });

  //   return updatedUser;
  // }

  // async getUserGuilds(discordId: string) {
  //   console.log(discordId);
  //   const guilds = await this.prisma.guild.findMany({
  //     where: {
  //       OR: [
  //         {
  //           ownerId: discordId,
  //         },
  //         {
  //           members: {
  //             some: {
  //               userId: discordId,
  //               roles: {
  //                 some: {
  //                   permissions: {
  //                     has: Permission.LOOTLOG_READ,
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //       ],
  //     },
  //   });

  //   return guilds;
  // }

  // getUserAvatarURL(user: User) {
  //   return user.avatar
  //     ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.webp`
  //     : null;
  // }
}
