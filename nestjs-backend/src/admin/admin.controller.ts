import { 
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import * as bcrypt from 'bcrypt'; // <--- 1. BCRYPT IMPORT KIYA

// Doctor Imports
import { DoctorsService } from 'src/doctors/doctors.service';
import { Doctor } from 'src/entities/entities/Doctor';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

// Patient Imports
import { PatientsService } from 'src/patients/patients.service';
import { Patient } from 'src/entities/entities/Patient';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

//Radiologist Imports
import { Radiologist } from 'src/entities/entities/Radiologist';
import { RadiologistService } from 'src/radiologists/radiologists.service';
import { CreateRadiologistDto } from './dto/create-radiologist.dto';
import { UpdateRadiologistDto } from './dto/update-radiologist.dto';

//Admin imports
import { AdminService } from './admin.service';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';

@Controller('admin')
@UseGuards(AuthGuard('admin-jwt'), RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
    private readonly radiologistService: RadiologistService,
     private readonly adminService: AdminService,
  ) {}

 // ===================== DASHBOARD STATS =====================
 @Get('dashboard/stats')
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }

  // ====================================================
  //                      DOCTORS SECTION
  // ====================================================

  @Get('doctors')
  async findAllDoctors(): Promise<Doctor[]> {
    return this.doctorsService.findAllDoctor();
  }

  @Post('doctors')
  async createDoctor(@Body() dto: CreateDoctorDto): Promise<Doctor> {
    // --- FIX: Hash Password before creating ---
    if(dto.password) {
      const salt = await bcrypt.genSalt();
      dto.password = await bcrypt.hash(dto.password, salt);
    }
    return this.doctorsService.createDoctor(dto);
  }

  @Delete('doctors/:id')
  async removeDoctor(@Param('id') id: number): Promise<{ message: string }> {
    await this.doctorsService.deleteDoctor(id);
    return { message: `Doctor with id ${id} deleted successfully` };
  }

  @Patch('doctors/:id')
  async updateDoctor(
    @Param('id') id: number,
    @Body() dto: UpdateDoctorDto,
  ): Promise<Doctor> {
    // --- FIX: Update Password Logic ---
    if (dto.password && dto.password.length > 0) {
       // Agar password naya aya hai toh hash karo
       const salt = await bcrypt.genSalt();
       dto.password = await bcrypt.hash(dto.password, salt);
    } else {
       // Agar password khali hai toh DTO se nikal do taake purana overwrite na ho
       delete dto.password;
    }
    return this.doctorsService.updateDoctor(id, dto);
  }

  // ====================================================
  //                      PATIENTS SECTION
  // ====================================================

  @Get('patients')
  async getAllPatients(): Promise<Patient[]> {
    return this.patientsService.findAllPatients();
  }

  @Post('patients')
  async createPatient(@Body() dto: CreatePatientDto): Promise<Patient> {
    // Note: Patients ka password usually nahi hota, agar hai toh yahan bhi hash karlo
    return this.patientsService.createPatient(dto);
  }

  @Delete('patients/:id')
  async deletePatient(@Param('id') id: number): Promise<{ message: string }> {
    await this.patientsService.deletePatient(id);
    return { message: `Patient with id ${id} deleted successfully` };
  }

  @Patch('patients/:id')
  async updatePatient(
    @Param('id') id: number,
    @Body() dto: UpdatePatientDto,
  ): Promise<Patient> {
    return this.patientsService.updatePatient(id, dto);
  }

  // ====================================================
  //                      RADIOLOGIST SECTION
  // ====================================================

   @Get('radiologists')
  async getAllRadiologists(): Promise<Radiologist[]> {
    return this.radiologistService.findAllRadiologists();
  }

  @Post('radiologists')
  async createRadiologist(
    @Body() dto: CreateRadiologistDto,
  ): Promise<Radiologist> {
    // --- FIX: Hash Password before creating ---
    if(dto.password) {
      const salt = await bcrypt.genSalt();
      dto.password = await bcrypt.hash(dto.password, salt);
    }
    return this.radiologistService.createRadiologist(dto);
  }

   // ---- DELETE ----
  @Delete('radiologists/:id')
  async delete(@Param('id') id: number) {
    await this.radiologistService.deleteRadiologist(id);
    return { message: `Radiologist with id ${id} deleted successfully` };
  }

  @Patch('radiologists/:id')
  async updateRadiologist(
    @Param('id') id: number,
    @Body() dto: UpdateRadiologistDto
  ): Promise<Radiologist> {
    // --- FIX: Update Password Logic ---
    if (dto.password && dto.password.length > 0) {
      const salt = await bcrypt.genSalt();
      dto.password = await bcrypt.hash(dto.password, salt);
    } else {
      delete dto.password;
    }
    return this.radiologistService.updateRadiologist(id, dto);
  }

  //get all radiologists with report count 
  @Get('radiologists/with-report-count')
  async getRadiologistsWithReportCount() {
    return this.radiologistService.getRadiologistsWithReportCount();
  }
}