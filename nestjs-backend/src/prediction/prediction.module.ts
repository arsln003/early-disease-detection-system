

import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionService } from './prediction.service';
import { AiResult } from 'src/entities/entities/AiResult';
import { Feature } from 'src/entities/entities/Feature';
import { Report } from 'src/entities/entities/Report';
import { Assignment } from 'src/entities/entities/Assignment';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([AiResult, Feature, Report, Assignment]),
  ],
  providers: [PredictionService],
  exports: [PredictionService],
})
export class PredictionModule {}