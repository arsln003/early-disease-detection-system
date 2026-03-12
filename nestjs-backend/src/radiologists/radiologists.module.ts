import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadiologistController } from './radiologists.controller';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { RadiologistService } from './radiologists.service';
import { OcrModule } from 'src/ocr/ocr.module';
import { ReportsModule } from 'src/reports/reports.module';
import { PredictionModule } from 'src/prediction/prediction.module';
@Module({
  imports: [TypeOrmModule.forFeature([Radiologist]),
  OcrModule, ReportsModule, PredictionModule
  ],
  controllers: [RadiologistController],
  providers: [RadiologistService],
  exports: [RadiologistService], 
})
export class RadiologistModule {}
