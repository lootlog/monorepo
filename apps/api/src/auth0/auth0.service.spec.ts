import { Test, TestingModule } from '@nestjs/testing';
import { Auth0Service } from './auth0.service';

describe('Auth0Service', () => {
  let service: Auth0Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [Auth0Service],
    }).compile();

    service = module.get<Auth0Service>(Auth0Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
