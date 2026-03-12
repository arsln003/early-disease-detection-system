import { Test, TestingModule } from '@nestjs/testing';
import { DoctornestController } from './doctornest.controller';

describe('DoctornestController', () => {
  let controller: DoctornestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DoctornestController],
    }).compile();

    controller = module.get<DoctornestController>(DoctornestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
