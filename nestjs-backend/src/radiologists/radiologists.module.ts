import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RadiologistController } from './radiologists.controller';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { RadiologistService } from './radiologists.service';
import { OcrModule } from 'src/ocr/ocr.module';
import { PatientsModule } from 'src/patients/patients.module';  // ✅ add
import { ReportsModule } from 'src/reports/reports.module';
import { PredictionModule } from 'src/prediction/prediction.module';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [TypeOrmModule.forFeature([Radiologist]),
  OcrModule, PatientsModule, ReportsModule, PredictionModule, AuthModule
  ],
  controllers: [RadiologistController],
  providers: [RadiologistService],
  exports: [RadiologistService,TypeOrmModule], 
})
export class RadiologistModule {}
