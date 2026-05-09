import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { StrokeService } from './stroke.service';

import { StrokeReport } from 'src/entities/entities/StrokeReport';
import { StrokeResult } from 'src/entities/entities/StrokeResult';
import { Patient } from 'src/entities/entities/Patient';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { Assignment } from 'src/entities/entities/Assignment';
import { Doctor } from 'src/entities/entities/Doctor';

import { FirebaseModule } from 'src/firebase/firebase.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StrokeReport,
      StrokeResult,
      Patient,
      Radiologist,
      Assignment,
      Doctor,
    ]),
    FirebaseModule,
  ],
  providers: [StrokeService],
  exports: [StrokeService],
})
export class StrokeModule {}