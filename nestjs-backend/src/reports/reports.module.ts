import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from 'src/entities/entities/Report';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { OcrModule } from 'src/ocr/ocr.module';
import { Feature } from 'src/entities/entities/Feature';
import { Patient } from 'src/entities/entities/Patient';

@Module({
   imports: [
    TypeOrmModule.forFeature([
      Report,
      Radiologist,
      Feature,
      Patient,
    ]),
    OcrModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
   exports: [ReportsService],
})
export class ReportsModule {}
