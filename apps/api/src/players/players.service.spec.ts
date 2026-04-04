import { Test, type TestingModule } from "@nestjs/testing";
import { mockFn } from "src/test/mock-fn";
import { PlayersService } from "./players.service";
import { AmqpConnection } from "@golevelup/nestjs-rabbitmq";

describe("PlayersService", () => {
  let service: PlayersService;

  const mockAmqpConnection = {
    publish: mockFn(),
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
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
