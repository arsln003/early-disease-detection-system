import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, Req, BadRequestException, Patch, Body, Post } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateDoctorFcmTokenDto } from '../admin/dto/update-doctor-fcmtoken.dto';
import { PredictionService } from 'src/prediction/prediction.service';

@Roles('doctor')                        // ✅ lowercase matches JWT payload
@UseGuards(JwtAuthGuard, RolesGuard)    // ✅ use JwtAuthGuard, not AuthGuard('jwt')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService,
              private readonly predictionService: PredictionService
  ) {}

  // GET /doctors/:id/assigned-patients/details?severity=critical|moderate|normal|all
  @Get(':id/assigned-patients/details')
  getAssignedPatientsWithDetails(
    @Param('id', ParseIntPipe) id: number,          // ✅ ParseIntPipe, no manual +id
    @Query('severity') severity: 'all' | 'critical' | 'moderate' | 'normal' = 'all',
  ) {
    return this.doctorsService.getAssignedPatientsWithDetails(id, severity);
  }



  // GET /doctors/my-patients  ← logged in doctor sees their own patients
  @Get('my-patients')
  getMyPatients(@Req() req: any) {
    return this.doctorsService.getAssignedPatients(req.user.id);
  }


 @Patch('fcm-token')
  saveFcmToken(
    @Req() req: any,
    @Body() dto: UpdateDoctorFcmTokenDto,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('Authenticated doctor not found in request');
    }

    return this.doctorsService.saveFcmToken(req.user.id, dto.fcmtoken);
  }

// ── Prediction ─────────────────────────────────────────────────────────
@Post('predict/:reportId')
generatePrediction(
  @Param('reportId', ParseIntPipe) reportId: number,
  @Req() req: any,
) {
  const doctorId: number = req.user.id;
  return this.predictionService.predictFromFeature(reportId, doctorId);
}

@Get('prediction/:reportId')
getPrediction(
  @Param('reportId', ParseIntPipe) reportId: number,
  @Req() req: any,
) {
  const doctorId: number = req.user.id;
  return this.predictionService.getPredictionByReportId(reportId, doctorId);
}

}