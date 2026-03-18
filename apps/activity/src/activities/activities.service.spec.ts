import { Test, TestingModule } from "@nestjs/testing";
import { ActivitiesService } from "./activities.service";
import { PrismaService } from "src/shared/db/prisma.service";

describe("ActivitiesService", () => {
  let service: ActivitiesService;
  const prismaServiceMock = {} as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        { provide: PrismaService, useValue: prismaServiceMock },
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
