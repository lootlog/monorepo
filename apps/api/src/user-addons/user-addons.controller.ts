import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { UserId } from 'src/shared/decorators/user-id.decorator';
import { CreateUserAddonDto } from 'src/user-addons/dto/create-user-addon.dto';
import { UpdateUserAddonDto } from 'src/user-addons/dto/update-user-addon.dto';
import { AddonTypeBundleEntity } from 'src/user-addons/entities/addon-type-bundle.entity';
import { RuntimeAddonEntity } from 'src/user-addons/entities/runtime-addon.entity';
import { UserAddonEntity } from 'src/user-addons/entities/user-addon.entity';
import { UserAddonsService } from 'src/user-addons/user-addons.service';

@ApiTags('user-addons')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users/@me/addons')
export class UserAddonsController {
  constructor(private readonly userAddonsService: UserAddonsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get user addons',
    description: 'Get all addons uploaded by current user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user addons',
    type: [UserAddonEntity],
  })
  async getUserAddons(@UserId() userId: string) {
    const addons = await this.userAddonsService.listUserAddons(userId);
    return plainToInstance(UserAddonEntity, addons);
  }

  @Get('/runtime')
  @ApiOperation({
    summary: 'Get installed addons for runtime',
    description: 'Get installed addons with compiled runtime code',
  })
  @ApiResponse({
    status: 200,
    description: 'Installed addons for game-client runtime',
    type: [RuntimeAddonEntity],
  })
  async getRuntimeAddons(@UserId() userId: string) {
    const addons = await this.userAddonsService.getRuntimeAddons(userId);
    return plainToInstance(RuntimeAddonEntity, addons);
  }

  @Get('/type-bundle')
  @ApiOperation({
    summary: 'Get addon editor type bundle',
    description:
      'Returns game-client type definitions used by Monaco IntelliSense in addon editor',
  })
  @ApiResponse({
    status: 200,
    description: 'Type bundle for addon editor',
    type: AddonTypeBundleEntity,
  })
  async getTypeBundle() {
    return this.userAddonsService.getTypeBundle();
  }

  @Post()
  @ApiOperation({
    summary: 'Create user addon',
    description: 'Create a new addon and compile source code for runtime',
  })
  @ApiResponse({
    status: 201,
    description: 'Addon created',
    type: UserAddonEntity,
  })
  async createAddon(
    @UserId() userId: string,
    @Body() dto: CreateUserAddonDto,
  ) {
    const addon = await this.userAddonsService.createUserAddon(userId, dto);
    return plainToInstance(UserAddonEntity, addon);
  }

  @Patch('/:addonId')
  @ApiOperation({
    summary: 'Update user addon',
    description: 'Update addon metadata/source and recompile when needed',
  })
  @ApiParam({
    name: 'addonId',
    description: 'User addon id',
  })
  @ApiResponse({
    status: 200,
    description: 'Addon updated',
    type: UserAddonEntity,
  })
  async updateAddon(
    @UserId() userId: string,
    @Param('addonId') addonId: string,
    @Body() dto: UpdateUserAddonDto,
  ) {
    const addon = await this.userAddonsService.updateUserAddon(
      userId,
      addonId,
      dto,
    );
    return plainToInstance(UserAddonEntity, addon);
  }

  @Post('/:addonId/install')
  @ApiOperation({
    summary: 'Install addon',
    description: 'Mark addon as installed so game-client can load it',
  })
  @ApiParam({
    name: 'addonId',
    description: 'User addon id',
  })
  @ApiResponse({
    status: 200,
    description: 'Addon installed',
    type: UserAddonEntity,
  })
  async installAddon(
    @UserId() userId: string,
    @Param('addonId') addonId: string,
  ) {
    const addon = await this.userAddonsService.installAddon(userId, addonId);
    return plainToInstance(UserAddonEntity, addon);
  }

  @Post('/:addonId/uninstall')
  @ApiOperation({
    summary: 'Uninstall addon',
    description: 'Mark addon as uninstalled',
  })
  @ApiParam({
    name: 'addonId',
    description: 'User addon id',
  })
  @ApiResponse({
    status: 200,
    description: 'Addon uninstalled',
    type: UserAddonEntity,
  })
  async uninstallAddon(
    @UserId() userId: string,
    @Param('addonId') addonId: string,
  ) {
    const addon = await this.userAddonsService.uninstallAddon(userId, addonId);
    return plainToInstance(UserAddonEntity, addon);
  }

  @Delete('/:addonId')
  @ApiOperation({
    summary: 'Delete addon',
    description: 'Delete user addon permanently',
  })
  @ApiParam({
    name: 'addonId',
    description: 'User addon id',
  })
  @ApiResponse({
    status: 200,
    description: 'Addon deleted',
    schema: {
      example: {
        success: true,
      },
    },
  })
  async deleteAddon(
    @UserId() userId: string,
    @Param('addonId') addonId: string,
  ) {
    return this.userAddonsService.deleteUserAddon(userId, addonId);
  }
}
