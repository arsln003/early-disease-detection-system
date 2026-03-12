import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '@nestjs-modules/ioredis';
import { MailerModule } from '@nestjs-modules/mailer';
import { ScheduleModule } from '@nestjs/schedule';
// import { AdminAppModule } from './Admin/admin.app.module';
import { DoctorsModule } from './doctors/doctors.module';
import { Doctor } from './entities/entities/Doctor';
import { Patient } from './entities/entities/Patient';
import { Assignment } from './entities/entities/Assignment';
import { Admin } from './entities/entities/Admin';

import { Report } from './entities/entities/Report';
import { AiResult } from './entities/entities/AiResult';
import { Radiologist } from './entities/entities/Radiologist';
import { PatientsModule } from './patients/patients.module';
import { AdminModule } from './admin/admin.module';
import { RadiologistModule } from './radiologists/radiologists.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { ReportsModule } from './reports/reports.module';
import { DoctornestController } from './g/doctornest.controller';
//import { AuthModule } from './admin/auth/auth.module';
import { AuthModule } from './auth/auth.module';
import { OcrModule } from './ocr/ocr.module';
import { Feature } from './entities/entities/Feature';
import { PredictionModule } from './prediction/prediction.module';


@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
       ssl: { rejectUnauthorized: false },


      autoLoadEntities: true,
      synchronize: false,
      entities: [Doctor, Patient, Assignment, Admin,Report,AiResult,Radiologist,Feature],

    }),
  
 AuthModule,

    DoctorsModule,
    PatientsModule,
    AdminModule,
    RadiologistModule,
    AssignmentsModule,
    ReportsModule,
    OcrModule,
    PredictionModule

  ],
  controllers: [DoctornestController],
})
export class AppModule {}


