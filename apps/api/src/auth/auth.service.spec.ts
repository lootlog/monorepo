import { Test, type TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { RedisService } from 'src/lib/redis/redis.service';
import { of } from 'rxjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockHttpService = {
    post: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue({
      serviceUrl: 'http://localhost/api/auth',
      internalUrl: 'http://localhost:3001',
      jwksUri: 'http://localhost:3001/idp/jwks',
    }),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    process.env.INTERNAL_SERVICE_AUTH_SECRET = 'test-internal-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should call the internal auth token endpoint with the shared secret', async () => {
    mockRedisService.get.mockResolvedValue(null);
    mockHttpService.post.mockReturnValue(
      of({
        data: {
          accessToken: 'token',
          expiresIn: 3600,
          scopes: ['identify'],
        },
      }),
    );

    await service.getIdpToken('user-123');

    expect(mockHttpService.post).toHaveBeenCalledWith(
      'http://localhost:3001/auth/internal/idp-token',
      { userId: 'user-123' },
      expect.objectContaining({
        headers: {
          'X-Internal-Service-Secret': 'test-internal-secret',
        },
      }),
    );
  });
});
