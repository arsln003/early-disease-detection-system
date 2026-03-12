import { Body, Controller, Delete, Get, Param, Patch, Post, Query,UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { Doctor } from 'src/entities/entities/Doctor';
import { Assignment } from 'src/entities/entities/Assignment';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';


@Controller('doctors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('Doctor')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

// 3️⃣ Postman calls for each tab

// Base URL: http://localhost:3000/doctors/3/assigned-patients/details

// All
// GET /doctors/3/assigned-patients/details?severity=all

// Critical
// GET /doctors/3/assigned-patients/details?severity=critical

// Moderate
// GET /doctors/3/assigned-patients/details?severity=moderate

// Normal
// GET /doctors/3/assigned-patients/details?severity=normal


 
  // GET /doctors/3/assigned-patients/details?severity=critical|moderate|normal|all
  @Get(':id/assigned-patients/details')
  async getAssignedPatientsWithDetails(
    @Param('id') id: number,
    @Query('severity') severity?: 'all' | 'critical' | 'moderate' | 'normal',
  ) {
    return this.doctorsService.getAssignedPatientsWithDetails(
      +id,
      (severity as any) || 'all',
    );
  }
}
