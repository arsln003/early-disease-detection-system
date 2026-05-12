import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, Req, BadRequestException, Patch, Body, Post, UnauthorizedException, InternalServerErrorException } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UpdateDoctorFcmTokenDto } from '../admin/dto/update-doctor-fcmtoken.dto';
import { PredictionService } from 'src/prediction/prediction.service';
import { CadicaService } from 'src/cadica/cadica.service';
import { StrokeService } from 'src/stroke/stroke.service';
import { ReportsService } from 'src/reports/reports.service';
@Roles('doctor')                        // ✅ lowercase matches JWT payload
@UseGuards(JwtAuthGuard, RolesGuard)    // ✅ use JwtAuthGuard, not AuthGuard('jwt')
@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService,
              private readonly predictionService: PredictionService,
                private readonly cadicaService: CadicaService,
                 private readonly strokeService: StrokeService,
                  private readonly reportService: ReportsService, 

  ) {}

  // GET /doctors/:id/assigned-patients/details?severity=critical|moderate|normal|all
  // @Get(':id/assigned-patients/details')
  // getAssignedPatientsWithDetails(
  //   @Param('id', ParseIntPipe) id: number,          // ✅ ParseIntPipe, no manual +id
  //   @Query('severity') severity: 'all' | 'critical' | 'moderate' | 'normal' = 'all',
  // ) {
  //   return this.doctorsService.getAssignedPatientsWithDetails(id, severity);
  // }

    @Get(':id/assigned-cardio-patients/details')
  getAssignedPatientsWithDetails(
    @Param('id', ParseIntPipe) id: number,          // ✅ ParseIntPipe, no manual +id
    @Query('severity') severity: 'all' | 'low' | 'high' = 'all',
  ) {
    return this.doctorsService.getCardioAssignedPatientsWithDetails(id, severity);
  }


@Get(':id/assigned-stroke-patients/details')
getStrokeAssignedPatientsWithDetails(
  @Param('id', ParseIntPipe) id: number,
  @Query('severity')
  severity: 'all' | 'no-stroke' | 'ischemia' | 'hemorrhage' = 'all',
) {
  return this.doctorsService.getStrokeAssignedPatientsWithDetails(id, severity);
}

@Get(':id/assigned-cadica-patients/details')
getCadicaAssignedPatientsWithDetails(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.doctorsService.getCadicaAssignedPatientsWithDetails(id);
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


@Get('prediction/:reportId')
getPrediction(
  @Param('reportId', ParseIntPipe) reportId: number,
  @Req() req: any,
) {
  const doctorId: number = req.user.id;
  return this.predictionService.getPredictionByReportId(reportId, doctorId);
}


//cadica video report prediction
@Post('cadica-video-reports/:cadicaVideoReportId/predict')
predictCadicaVideoReport(
  @Req() req: any,
  @Param('cadicaVideoReportId', ParseIntPipe) cadicaVideoReportId: number,
) {
  const doctorId: number = req.user.id;

  return this.cadicaService.predictCadicaVideoReport(
    doctorId,
    cadicaVideoReportId,
  );
}

//get cadica results
@Get('cadica-video-reports/:cadicaVideoReportId/prediction')
getCadicaPrediction(
  @Req() req: any,
  @Param('cadicaVideoReportId', ParseIntPipe) cadicaVideoReportId: number,
) {
  const doctorId: number = req.user.id;

  return this.cadicaService.getCadicaPrediction(
    doctorId,
    cadicaVideoReportId,
  );
}


// ── Stroke Prediction Result ─────────────────────────────────────────
@Get('stroke-reports/:strokeReportId/prediction')
getStrokePrediction(
  @Param('strokeReportId', ParseIntPipe) strokeReportId: number,
  @Req() req: any,
) {
  const doctorId: number = req.user.id;

  if (!doctorId) {
    throw new UnauthorizedException('Invalid doctor token');
  }

  return this.strokeService.getStrokePredictionForDoctor(
    doctorId,
    strokeReportId,
  );
}


//get all reports by patient id for logged in doctor
// Get all reports by patient id for logged in doctor
@Get('all-reports/:patientId')
async getReportsByPatientId(
  @Param('patientId', ParseIntPipe) patientId: number,
  @Req() req: any,
) {
  const doctorId: number = req.user.id;  // ✅ clean, no fallback chain needed

  if (!doctorId) {
    throw new UnauthorizedException('Invalid doctor token');  // Handle invalid doctor token
  }
  try {
    return await this.reportService.getReportsByPatientId(doctorId, patientId); // Fetch reports using service
  } catch (error) {
    // Log and throw a generic server error if something goes wrong
    throw new InternalServerErrorException('Error fetching reports', error.message);
  }
}


// ── CADICA Video Reports by Patient ID ─────────────────────────────
@Get('/all-cadica-video-reports/:patientId')
async getCadicaVideoReportsByPatientId(
  @Param('patientId', ParseIntPipe) patientId: number,  // Capture patientId from the request
) {
  return this.cadicaService.getCadicaVideoReportsByPatientId(patientId);  // Call service to get CADICA reports
}


@Get('all-stroke-reports/:patientId')
async getStrokeReportsByPatientId(
  @Param('patientId', ParseIntPipe) patientId: number,  // Capture patientId from the route
) {
  return this.strokeService.getStrokeReportsByPatientId(patientId);  // Call the service method
}

//get profile details
@Get('get-profile/:doctorid')
getDoctorProfile(@Param('doctorid', ParseIntPipe) doctorid: number) {
  return this.doctorsService.getDoctorProfile(doctorid);
}



//get cardio report
@Get('cardio-reports/:reportid')
getReportDetails(@Param('reportid', ParseIntPipe) reportid: number) {
  return this.reportService.getReportDetails(reportid);
}

//get stroke report details
@Get('stroke-reports/:strokereportid')
getStrokeReportDetails(
  @Param('strokereportid', ParseIntPipe) strokereportid: number,
) {
  return this.strokeService.getStrokeReportDetails(strokereportid);
}


//no of assign patients

@Get('assigned-patients-count/:doctorid')
getAssignedPatientsCount(
  @Param('doctorid', ParseIntPipe) doctorid: number,
) {
  return this.doctorsService.getAssignedPatientsCount(doctorid);
}


}