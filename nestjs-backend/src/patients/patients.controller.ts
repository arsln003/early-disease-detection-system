import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Patient } from 'src/entities/entities/Patient';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}


}
