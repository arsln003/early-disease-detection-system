

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
import { ApiBody, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@Roles('admin')                      // ✅ correct position & lowercase
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiTags('Admin')  // Tagging for Swagger UI grouping
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
@ApiResponse({ status: 200, description: 'Get dashboard statistics' })

  getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Doctors ────────────────────────────────────────────────────────────
  @Get('doctors')
    @ApiResponse({ status: 200, description: 'List of doctors', type: [Doctor] })
  findAllDoctors(): Promise<Doctor[]> {
    return this.doctorsService.findAllDoctor();
  }

  @Post('doctors')
    @ApiBody({ type: CreateDoctorDto, description: 'Create a new doctor' })
  @ApiResponse({ status: 201, description: 'Doctor created successfully', type: Doctor })
  createDoctor(@Body() dto: CreateDoctorDto): Promise<Doctor> {
    return this.doctorsService.createDoctor(dto); // hashing moved to service
  }

  @Patch('doctors/:id')
    @ApiParam({ name: 'id', description: 'Doctor ID' })
  @ApiBody({ type: UpdateDoctorDto, description: 'Update doctor information' })
  @ApiResponse({ status: 200, description: 'Doctor updated successfully', type: Doctor })
  updateDoctor(
    @Param('id', ParseIntPipe) id: number,  // ✅ ParseIntPipe
    @Body() dto: UpdateDoctorDto,
  ): Promise<Doctor> {
    return this.doctorsService.updateDoctor(id, dto); // hashing moved to service
  }

  @Delete('doctors/:id')
    @ApiParam({ name: 'id', description: 'Doctor ID to delete' })
  @ApiResponse({ status: 200, description: 'Doctor deleted successfully' })
  async removeDoctor(@Param('id', ParseIntPipe) id: number) {
    await this.doctorsService.deleteDoctor(id);
    return { message: `Doctor with id ${id} deleted successfully` };
  }

  // ── Patients ───────────────────────────────────────────────────────────
@Get('patients')
 @ApiResponse({ status: 200, description: 'List of patients', type: [Patient] })
async getAllPatients() {
  return await this.patientsService.findAllPatients();
}
 @Post('patients')
   @ApiBody({ type: CreatePatientDto, description: 'Create a new patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully', type: Patient })
createPatient(
  @Body() dto: CreatePatientDto,
  @Req() req: any,
) {
  return this.patientsService.createPatient(dto, req.user.id);
}
  @Patch('patients/:id')
    @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiBody({ type: UpdatePatientDto, description: 'Update patient information' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully', type: Patient })
  updatePatient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePatientDto,
  ): Promise<Patient> {
    return this.patientsService.updatePatient(id, dto);
  }

  @Delete('patients/:id')
    @ApiParam({ name: 'id', description: 'Patient ID to delete' })
  @ApiResponse({ status: 200, description: 'Patient deleted successfully' })
  async deletePatient(@Param('id', ParseIntPipe) id: number) {
    await this.patientsService.deletePatient(id);
    return { message: `Patient with id ${id} deleted successfully` };
  }

@Post('patients/:id/assign-doctor')
@ApiParam({ name: 'id', description: 'Patient ID to assign doctor' })
  @ApiBody({ type: AssignDoctorDto, description: 'Assign a doctor to a patient' })
  @ApiResponse({ status: 200, description: 'Doctor assigned successfully' })
assignDoctor(
  @Param('id', ParseIntPipe) patientId: number,
  @Body() dto: AssignDoctorDto,
  @Req() req: any,
) {
  return this.patientsService.assignDoctor(patientId, dto.doctorName, req.user.id);
}

@Patch('patients/:id/reassign-doctor')
@ApiParam({ name: 'id', description: 'Patient ID to reassign doctor' })
  @ApiBody({ type: AssignDoctorDto, description: 'Reassign a doctor to a patient' })
  @ApiResponse({ status: 200, description: 'Doctor reassigned successfully' })
reassignDoctor(
  @Param('id', ParseIntPipe) patientId: number,
  @Body() dto: AssignDoctorDto,
  @Req() req: any,
) {
  return this.patientsService.reassignDoctor(patientId, dto.doctorName, req.user.id);
}


  // ── Radiologists ───────────────────────────────────────────────────────
  @Get('radiologists/with-report-count')  // ✅ specific route BEFORE :id
    @ApiResponse({ status: 200, description: 'List of radiologists with report count', type: [Radiologist] })
  getRadiologistsWithReportCount() {
    return this.radiologistService.getRadiologistsWithReportCount();
  }

  @Get('radiologists')
    @ApiResponse({ status: 200, description: 'List of radiologists', type: [Radiologist] })
  getAllRadiologists(): Promise<Radiologist[]> {
    return this.radiologistService.findAllRadiologists();
  }

  @Post('radiologists')
   @ApiBody({ type: CreateRadiologistDto, description: 'Create a new radiologist' })
  @ApiResponse({ status: 201, description: 'Radiologist created successfully', type: Radiologist })
  createRadiologist(@Body() dto: CreateRadiologistDto): Promise<Radiologist> {
    return this.radiologistService.createRadiologist(dto); // hashing moved to service
  }

  @Patch('radiologists/:id')
   @ApiParam({ name: 'id', description: 'Radiologist ID' })
  @ApiBody({ type: UpdateRadiologistDto, description: 'Update radiologist information' })
  @ApiResponse({ status: 200, description: 'Radiologist updated successfully', type: Radiologist })
  updateRadiologist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRadiologistDto,
  ): Promise<Radiologist> {
    return this.radiologistService.updateRadiologist(id, dto); // hashing moved to service
  }

  @Delete('radiologists/:id')
   @ApiParam({ name: 'id', description: 'Radiologist ID to delete' })
  @ApiResponse({ status: 200, description: 'Radiologist deleted successfully' })
  async deleteRadiologist(@Param('id', ParseIntPipe) id: number) {
    await this.radiologistService.deleteRadiologist(id);
    return { message: `Radiologist with id ${id} deleted successfully` };
  }

  // ── Admin ──────────────────────────────────────────────────────────────
  @Post('create')
    @ApiBody({ description: 'Create a new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully', type: Admin })
  createAdmin(
    @Body('fullname') fullname: string,
    @Body('email') email: string,
    @Body('password') password: string,
    @Body('contactnumber') contactnumber: string,
  ): Promise<Admin> {
    return this.adminService.addAdmin(fullname, email, password, contactnumber);
  }


  @Get('get-profile/:adminid')
getAdminProfile(@Param('adminid', ParseIntPipe) adminid: number) {
  return this.adminService.getAdminProfile(adminid);
}
}