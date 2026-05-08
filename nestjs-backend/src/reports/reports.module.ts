import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from 'src/entities/entities/Report';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { OcrModule } from 'src/ocr/ocr.module';
import { Feature } from 'src/entities/entities/Feature';
import { Patient } from 'src/entities/entities/Patient';
import { Assignment } from 'src/entities/entities/Assignment';
import { Doctor } from 'src/entities/entities/Doctor';
import { FirebaseService } from 'src/firebase/firebase.service';
import { CadicaResult } from 'src/entities/entities/CadicaResult';
import { CadicaModule } from 'src/cadica/cadica.module';
import { HttpModule } from '@nestjs/axios';
import { AiResult } from 'src/entities/entities/AiResult';
@Module({
   imports: [
    TypeOrmModule.forFeature([
      Report,
      Radiologist,
      Feature,
      Patient,
           Assignment, // ← add karo agar nahi hai
      Doctor,  
       CadicaResult,
         AiResult,  // ← add karo agar nahi hai
    ]),
    OcrModule,
    CadicaModule,  // ← add karo
    HttpModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService, FirebaseService],
   exports: [ReportsService],
})
export class ReportsModule {}
