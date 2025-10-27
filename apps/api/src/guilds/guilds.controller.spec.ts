import { Test, type TestingModule } from '@nestjs/testing';
import { GuildsController } from './guilds.controller';
import { GuildsService } from './guilds.service';
import { AuthGuard } from 'src/shared/guards/auth.guard';
import { PermissionsGuard } from 'src/shared/permissions/permissions.guard';
import { MemberSyncInterceptor } from 'src/shared/interceptors/member-sync.interceptor';
import type { CallHandler, ExecutionContext } from '@nestjs/common';

describe('GuildsController', () => {
  let controller: GuildsController;

  const mockGuildsService = {
    getUserGuilds: jest.fn(),
    getUserGuildsWithPermissions: jest.fn(),
    getManageableUserGuilds: jest.fn(),
    getGuildById: jest.fn(),
    updateGuildConfig: jest.fn(),
    getWorldsByGuildId: jest.fn(),
  };

  const mockMemberSyncInterceptor = {
    intercept: (context: ExecutionContext, next: CallHandler) => next.handle(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GuildsController],
      providers: [
        {
          provide: GuildsService,
          useValue: mockGuildsService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(MemberSyncInterceptor)
      .useValue(mockMemberSyncInterceptor)
      .compile();

    controller = module.get<GuildsController>(GuildsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
