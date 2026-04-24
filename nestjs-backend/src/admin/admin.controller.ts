

import {
  Body, Controller, Delete, Get,
  Param, Patch, Post, UseGuards, ParseIntPipe,
  Req,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { DoctorsService } from 'src/doctors/doctors.service';
import { Doctor } from 'src/entities/entities/Doctor';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

import { PatientsService } from 'src/patients/patients.service';
import { Patient } from 'src/entities/entities/Patient';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

import { RadiologistService } from 'src/radiologists/radiologists.service';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { CreateRadiologistDto } from './dto/create-radiologist.dto';
import { UpdateRadiologistDto } from './dto/update-radiologist.dto';

import { AdminService } from './admin.service';
import { Admin } from 'src/entities/entities/Admin';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { AssignDoctorDto } from './dto/assign-doctor.dto';

@Roles('admin')                      // ✅ correct position & lowercase
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    private readonly radiologistService: RadiologistService,
    private readonly adminService: AdminService,
  ) {}

  // ── Dashboard ──────────────────────────────────────────────────────────
  @Get('dashboard/stats')
  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Doctors ────────────────────────────────────────────────────────────
  @Get('doctors')
  findAllDoctors(): Promise<Doctor[]> {
    return this.doctorsService.findAllDoctor();
  }

  @Post('doctors')
  createDoctor(@Body() dto: CreateDoctorDto): Promise<Doctor> {
    return this.doctorsService.createDoctor(dto); // hashing moved to service
  }

  @Patch('doctors/:id')
  updateDoctor(
    @Param('id', ParseIntPipe) id: number,  // ✅ ParseIntPipe
    @Body() dto: UpdateDoctorDto,
  ): Promise<Doctor> {
    return this.doctorsService.updateDoctor(id, dto); // hashing moved to service
  }

  @Delete('doctors/:id')
  async removeDoctor(@Param('id', ParseIntPipe) id: number) {
    await this.doctorsService.deleteDoctor(id);
    return { message: `Doctor with id ${id} deleted successfully` };
  }

  // ── Patients ───────────────────────────────────────────────────────────
  @Get('patients')
  getAllPatients(): Promise<Patient[]> {
    return this.patientsService.findAllPatients();
  }

 @Post('patients')
createPatient(
  @Body() dto: CreatePatientDto,
  @Req() req: any,
) {
  return this.patientsService.createPatient(dto, req.user.id);
}
  @Patch('patients/:id')
  updatePatient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ): Promise<Patient> {
    return this.patientsService.updatePatient(id, dto);
  }

  @Delete('patients/:id')
  async deletePatient(@Param('id', ParseIntPipe) id: number) {
    await this.patientsService.deletePatient(id);
    return { message: `Patient with id ${id} deleted successfully` };
  }

@Post('patients/:id/assign-doctor')
assignDoctor(
  @Param('id', ParseIntPipe) patientId: number,
  @Body() dto: AssignDoctorDto,
  @Req() req: any,
) {
  return this.patientsService.assignDoctor(patientId, dto.doctorName, req.user.id);
}

@Patch('patients/:id/reassign-doctor')
reassignDoctor(
  @Param('id', ParseIntPipe) patientId: number,
  @Body() dto: AssignDoctorDto,
  @Req() req: any,
) {
  return this.patientsService.reassignDoctor(patientId, dto.doctorName, req.user.id);
}


  // ── Radiologists ───────────────────────────────────────────────────────
  @Get('radiologists/with-report-count')  // ✅ specific route BEFORE :id
  getRadiologistsWithReportCount() {
    return this.radiologistService.getRadiologistsWithReportCount();
  }

  @Get('radiologists')
  getAllRadiologists(): Promise<Radiologist[]> {
    return this.radiologistService.findAllRadiologists();
  }

  @Post('radiologists')
  createRadiologist(@Body() dto: CreateRadiologistDto): Promise<Radiologist> {
    return this.radiologistService.createRadiologist(dto); // hashing moved to service
  }

  @Patch('radiologists/:id')
  updateRadiologist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRadiologistDto,
  ): Promise<Radiologist> {
    return this.radiologistService.updateRadiologist(id, dto); // hashing moved to service
  }

  @Delete('radiologists/:id')
  async deleteRadiologist(@Param('id', ParseIntPipe) id: number) {
    await this.radiologistService.deleteRadiologist(id);
    return { message: `Radiologist with id ${id} deleted successfully` };
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  @Post('create')
  createAdmin(
    @Body('fullname') fullname: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('contactnumber') contactnumber: string,
  ): Promise<Admin> {
    return this.adminService.addAdmin(fullname, email, password, contactnumber);
  }
}