// import { Module } from '@nestjs/common';
// import { PredictionService } from './prediction.service';

// @Module({
//   providers: [PredictionService]
// })
// export class PredictionModule {}



import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionService } from './prediction.service';
import { AiResult } from 'src/entities/entities/AiResult';
import { Feature } from 'src/entities/entities/Feature';
import { Report } from 'src/entities/entities/Report';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([AiResult, Feature, Report]),
  ],
  providers: [PredictionService],
  exports: [PredictionService],
})
export class PredictionModule {}