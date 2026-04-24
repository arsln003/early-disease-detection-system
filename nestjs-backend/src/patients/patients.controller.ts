import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Patient } from 'src/entities/entities/Patient';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // // ---- GET ALL PATIENTS ----
  // @Get()
  // async findAll(): Promise<Patient[]> {
  //   return this.patientsService.findAllPatients();
  // }

  // // ---- CREATE PATIENT ----
  // @Post()
  // async create(@Body() patientData: Partial<Patient>): Promise<Patient> {
  //   return this.patientsService.createPatient(patientData);
  // }

  // // ---- DELETE PATIENT ----
  // @Delete(':id')
  // async remove(@Param('id') id: number): Promise<{ message: string }> {
  //   await this.patientsService.deletePatient(id);
  //   return { message: `Patient with id ${id} deleted successfully` };
  // }

  // // ---- UPDATE PATIENT ----
  // @Patch(':id')
  // async update(
  //   @Param('id') id: number,
  //   @Body()
  //   body: Partial<
  //     Pick<Patient, 'fullname' | 'age' | 'gender' | 'contactnumber' | 'address'>
  //   >,
  // ): Promise<Patient> {
  //   return this.patientsService.updatePatient(id, body);
  // }
}
