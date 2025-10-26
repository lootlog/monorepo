import { Test, type TestingModule } from '@nestjs/testing';
import type { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { NpcsService } from './npcs.service';

describe('NpcsService', () => {
  let service: NpcsService;

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NpcsService,
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<NpcsService>(NpcsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
