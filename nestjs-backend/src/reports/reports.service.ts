import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from 'src/entities/entities/Report';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { OcrService } from 'src/ocr/ocr.service';
import { Feature } from 'src/entities/entities/Feature';
import { Patient } from 'src/entities/entities/Patient';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Radiologist)
    private readonly radiologistRepository: Repository<Radiologist>,
@InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    private readonly ocrService: OcrService,
  ) {}


  //not used yet, but can be used in the future for admin to view reports by radiologist
  async getReportsByRadiologistId(rid: number) {
    const reports = await this.reportsRepository.find({
      where: { radiologist: { radiologistid: rid } },
      relations: ['patient', 'aiResult', 'radiologist'],
      order: { uploadedat: 'DESC' },
    });

    if (reports.length === 0) {
      throw new NotFoundException(
        `No reports found for radiologist with ID ${rid}`,
      );
    }

    return reports;
  }





//upload reports
  async uploadAndAnalyzeFile(
    radiologistId: number,
    patientId: number,
    file: Express.Multer.File,
    comment?: string,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const lowerName = file.originalname?.toLowerCase() || '';

    const hasValidExtension = allowedExtensions.some((ext) =>
      lowerName.endsWith(ext),
    );

    if (!allowedMimeTypes.includes(file.mimetype) || !hasValidExtension) {
      throw new BadRequestException(
        'Only PDF, JPG, JPEG, and PNG files are allowed',
      );
    }

    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new BadRequestException('Invalid filename');
    }

    if (file.originalname.length > 255) {
      throw new BadRequestException(
        'Filename is too long. Maximum 255 characters allowed',
      );
    }

    if (!patientId || Number.isNaN(patientId)) {
      throw new BadRequestException('Valid patientId is required');
    }

    const radiologist = await this.radiologistRepository.findOne({
      where: { radiologistid: radiologistId },
    });

    if (!radiologist) {
      throw new NotFoundException('Radiologist not found');
    }

    const patient = await this.patientRepository.findOne({
      where: { patientid: patientId },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const report = this.reportsRepository.create({
      filename: file.originalname,
      filepath: file.originalname,
      comment: comment?.trim() || null,
      patient,
      radiologist,
    });

    const savedReport = await this.reportsRepository.save(report);

    const ocrResult = await this.ocrService.processFile(file);

    const feature = this.featureRepository.create({
  id_number: ocrResult.fields?.id_number ?? null,
  age: ocrResult.fields?.age ?? null,
  gender: ocrResult.fields?.gender ?? null,
  height: ocrResult.fields?.height ?? null,
  weight: ocrResult.fields?.weight ?? null,
  ap_hi: ocrResult.fields?.ap_hi ?? null,
  ap_lo: ocrResult.fields?.ap_lo ?? null,
  cholesterol: ocrResult.fields?.cholesterol ?? null,
  gluc: ocrResult.fields?.gluc ?? null,
  smoke: ocrResult.fields?.smoke ?? null,
  alco: ocrResult.fields?.alco ?? null,
  active: ocrResult.fields?.active ?? null,
  cardio: ocrResult.fields?.cardio ?? null,

  report: savedReport,
});

    const savedFeature = await this.featureRepository.save(feature);

    return {
      message: 'File processed and saved successfully',
      report: savedReport,
      feature: savedFeature,
      ocrResult,
    };
  }


// get all reports by patient id
async getReportsByPatientId(patientId: number) {
  if (!patientId || Number.isNaN(Number(patientId))) {
    throw new BadRequestException('Valid patientId is required');
  }

  const reports = await this.reportsRepository.find({
    where: {
      patient: { patientid: patientId },
    },
    relations: ['patient', 'radiologist', 'feature', 'aiResult'],
    order: {
      uploadedat: 'DESC',
    },
  });

  if (!reports.length) {
    throw new NotFoundException(
      `No reports found for patient with ID ${patientId}`,
    );
  }

  return reports;
}


}
