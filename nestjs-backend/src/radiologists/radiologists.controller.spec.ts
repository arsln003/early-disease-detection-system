import { Test, TestingModule } from '@nestjs/testing';
import { RadiologistController } from './radiologists.controller';

describe('RadiologistsController', () => {
  let controller: RadiologistController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RadiologistController],
    }).compile();

    controller = module.get<RadiologistController>(RadiologistController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
