import { Test, TestingModule } from '@nestjs/testing';
import { CadicaService } from './cadica.service';

describe('CadicaService', () => {
  let service: CadicaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CadicaService],
    }).compile();

    service = module.get<CadicaService>(CadicaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
