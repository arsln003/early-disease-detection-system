// admin/admin.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

import { DoctorsModule } from 'src/doctors/doctors.module';
import { PatientsModule } from 'src/patients/patients.module';
import { RadiologistModule } from 'src/radiologists/radiologists.module';

import { Doctor } from 'src/entities/entities/Doctor';
import { Patient } from 'src/entities/entities/Patient';
import { Report } from 'src/entities/entities/Report';
import { Admin } from 'src/entities/entities/Admin'; 
@Module({
  imports: [
    DoctorsModule,
    PatientsModule,
    RadiologistModule,
    TypeOrmModule.forFeature([Doctor, Patient, Report, Admin]), // 👈 add this
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService, TypeOrmModule],
})
export class AdminModule {}
