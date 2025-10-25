import { Test, TestingModule } from '@nestjs/testing';
import { HealthzController } from './healthz.controller';
import { HealthzService } from './healthz.service';

describe('HealthzController', () => {
  let controller: HealthzController;
  let healthzService: HealthzService;

  const mockHealthzService = {
    healthCheck: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthzController],
      providers: [
        {
          provide: HealthzService,
          useValue: mockHealthzService,
        },
      ],
    }).compile();

    controller = module.get<HealthzController>(HealthzController);
    healthzService = module.get<HealthzService>(HealthzService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
