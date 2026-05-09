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
import { FirebaseModule } from 'src/firebase/firebase.module';
import { Report } from 'src/entities/entities/Report';
import { Assignment } from 'src/entities/entities/Assignment';
import { Doctor } from 'src/entities/entities/Doctor';
import { Patient } from 'src/entities/entities/Patient';
import { CadicaVideoReport } from 'src/entities/entities/CadicaVideoReport';
import { CadicaModule } from 'src/cadica/cadica.module';
import { StrokeModule } from 'src/stroke/stroke.module';
@Module({
  imports: [TypeOrmModule.forFeature([Radiologist,Report,Assignment,Doctor,Patient,CadicaVideoReport]),  // ✅ add Doctor and Patient to TypeOrmModule
   FirebaseModule,
  OcrModule, PatientsModule, ReportsModule, PredictionModule, AuthModule,
  CadicaModule,StrokeModule
  ],
  controllers: [RadiologistController],
  providers: [RadiologistService],
  exports: [RadiologistService,TypeOrmModule], 
})
export class RadiologistModule {}
