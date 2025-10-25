import { Test, TestingModule } from '@nestjs/testing';
import { PlayersService } from './players.service';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

describe('PlayersService', () => {
  let service: PlayersService;
  let amqpConnection: AmqpConnection;

  const mockAmqpConnection = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayersService,
        {
          provide: AmqpConnection,
          useValue: mockAmqpConnection,
        },
      ],
    }).compile();

    service = module.get<PlayersService>(PlayersService);
    amqpConnection = module.get<AmqpConnection>(AmqpConnection);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
