

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  BadRequestException,
  UnauthorizedException,
  ParseIntPipe,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

import { RadiologistService } from './radiologists.service';
import { ReportsService } from 'src/reports/reports.service';
import { PredictionService } from 'src/prediction/prediction.service';

import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';      // ✅ correct import
import { RolesGuard } from 'src/auth/guards/roles.guard';            // ✅ correct import
import { Roles } from 'src/auth/decorators/roles.decorator';         // ✅ correct import
import { PatientsService } from 'src/patients/patients.service';

import { FirebaseService } from 'src/firebase/firebase.service'; 


@Roles('radiologist')                        // ✅ lowercase
@UseGuards(JwtAuthGuard, RolesGuard)         // ✅ JwtAuthGuard not AuthGuard('jwt')
@Controller('radiologists')
export class RadiologistController {
  constructor(
    private readonly radiologistService: RadiologistService,
    private readonly reportService: ReportsService,
    private readonly predictionService: PredictionService,
     private readonly patientsService: PatientsService,
  ) {}

  // ── Profile ────────────────────────────────────────────────────────────
  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.radiologistService.getMyProfile(req.user.id);  // ✅ req.user.id (from JWT sub)
  }

  // ── Upload & OCR ───────────────────────────────────────────────────────
  @Post('upload-ocr')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  uploadOcrFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
    @Body('patientId') patientId: string,
    @Body('comment') comment?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const radiologistId: number = req.user.id;  // ✅ always use req.user.id
    const parsedPatientId = Number(patientId);

    if (Number.isNaN(parsedPatientId)) {
      throw new BadRequestException('Valid patientId is required');
    }

    return this.reportService.uploadAndAnalyzeFile(
      radiologistId,
      parsedPatientId,
      file,
      comment,
    );
  }

  // ── Reports ────────────────────────────────────────────────────────────
  @Get('reports/:patientId')
  getReportsByPatientId(
    @Param('patientId', ParseIntPipe) patientId: number,
    @Req() req: any,
  ) {
    const radiologistId: number = req.user.id;  // ✅ clean, no fallback chain needed

    if (!radiologistId) {
      throw new UnauthorizedException('Invalid radiologist token');  // ✅ NestJS exception
    }
    return this.reportService.getReportsByPatientId(patientId);
  }

@Get('all-reports')
getAllReports() {
  return this.reportService.getAllReports();
}
//getall patients

@Get('patients')
getAllPatients() {
  return this.patientsService.findAllPatients();
}





@Post('patients/:patientId/upload-cadica-videos')
@UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage() }))
uploadCadicaVideosForPatient(
  @UploadedFiles() files: Express.Multer.File[],
  @Req() req: any,
  @Param('patientId', ParseIntPipe) patientId: number,
  @Body('comment') comment?: string,
) {
  if (!files || files.length === 0) {
    throw new BadRequestException('At least one video file is required');
  }

  const radiologistId: number = req.user.id;

  return this.radiologistService.uploadCadicaVideosOnly(
    radiologistId,
    patientId,
    files,
    comment,
  );
}


}