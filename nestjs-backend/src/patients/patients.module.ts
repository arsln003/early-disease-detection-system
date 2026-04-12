import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patient } from 'src/entities/entities/Patient';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';


import { Doctor } from 'src/entities/entities/Doctor';
import { Admin } from 'src/entities/entities/Admin'; 
import { Assignment } from 'src/entities/entities/Assignment';

@Module({
  imports: [TypeOrmModule.forFeature([Patient,Doctor, Admin, Assignment])],
  controllers: [PatientsController],
  providers: [PatientsService],
   exports: [PatientsService],
})
export class PatientsModule {}
