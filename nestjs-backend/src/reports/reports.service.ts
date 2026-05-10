// import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { Report } from 'src/entities/entities/Report';
// import { Radiologist } from 'src/entities/entities/Radiologist';
// import { OcrService } from 'src/ocr/ocr.service';
// import { Feature } from 'src/entities/entities/Feature';
// import { Patient } from 'src/entities/entities/Patient';
// import { Assignment } from 'src/entities/entities/Assignment';
// import { Doctor } from 'src/entities/entities/Doctor';
// import { FirebaseService } from 'src/firebase/firebase.service';
// import {CadicaService} from 'src/cadica/cadica.service';
// import { CadicaResult } from 'src/entities/entities/CadicaResult';
// import * as fs from 'fs';
// import * as path from 'path';
// import { randomUUID } from 'crypto';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import { AiResult } from 'src/entities/entities/AiResult';


// type AiPredictionResult =
//   | {
//       generated: true;
//       aiResult: any;
//     }
//   | {
//       generated: false;
//       reason: string;
//       missingFields?: string[];
//       invalidFields?: { field: string; value: any; reason: string }[];
//       apiResponse?: any;
//       error?: any;
//     }
//   | null;

// function isValidNumber(value: any): boolean {
//   return value !== null && value !== undefined && Number.isFinite(Number(value));
// }

// function validatePredictionPayload(payload: any) {
//   const requiredFields = [
//     'age',
//     'gender',
//     'height',
//     'weight',
//     'ap_hi',
//     'ap_lo',
//     'cholesterol',
//     'gluc',
//     'smoke',
//     'alco',
//     'active',
//   ];

//   const missingFields = requiredFields.filter(
//     (field) => payload[field] === null || payload[field] === undefined,
//   );

//   const invalidFields: { field: string; value: any; reason: string }[] = [];

//   for (const field of requiredFields) {
//     const value = payload[field];

//     if (value === null || value === undefined) continue;

//     if (!isValidNumber(value)) {
//       invalidFields.push({
//         field,
//         value,
//         reason: 'Value must be a valid number',
//       });
//     }
//   }

//   if (isValidNumber(payload.age) && Number(payload.age) <= 0) {
//     invalidFields.push({
//       field: 'age',
//       value: payload.age,
//       reason: 'Age must be greater than 0 days',
//     });
//   }

//   if (isValidNumber(payload.height) && Number(payload.height) <= 0) {
//     invalidFields.push({
//       field: 'height',
//       value: payload.height,
//       reason: 'Height must be greater than 0',
//     });
//   }

//   if (isValidNumber(payload.weight) && Number(payload.weight) <= 0) {
//     invalidFields.push({
//       field: 'weight',
//       value: payload.weight,
//       reason: 'Weight must be greater than 0',
//     });
//   }

//   if (isValidNumber(payload.ap_hi) && Number(payload.ap_hi) <= 0) {
//     invalidFields.push({
//       field: 'ap_hi',
//       value: payload.ap_hi,
//       reason: 'Systolic BP must be greater than 0',
//     });
//   }

//   if (isValidNumber(payload.ap_lo) && Number(payload.ap_lo) <= 0) {
//     invalidFields.push({
//       field: 'ap_lo',
//       value: payload.ap_lo,
//       reason: 'Diastolic BP must be greater than 0',
//     });
//   }

//   const binaryFields = ['smoke', 'alco', 'active'];
//   for (const field of binaryFields) {
//     if (
//       payload[field] !== null &&
//       payload[field] !== undefined &&
//       ![0, 1].includes(Number(payload[field]))
//     ) {
//       invalidFields.push({
//         field,
//         value: payload[field],
//         reason: 'Value must be 0 or 1',
//       });
//     }
//   }

//   if (
//     payload.gender !== null &&
//     payload.gender !== undefined &&
//     ![1, 2].includes(Number(payload.gender))
//   ) {
//     invalidFields.push({
//       field: 'gender',
//       value: payload.gender,
//       reason: 'Gender must be 1 or 2',
//     });
//   }

//   const categoryFields = ['cholesterol', 'gluc'];
//   for (const field of categoryFields) {
//     if (
//       payload[field] !== null &&
//       payload[field] !== undefined &&
//       ![1, 2, 3].includes(Number(payload[field]))
//     ) {
//       invalidFields.push({
//         field,
//         value: payload[field],
//         reason: 'Value must be 1, 2, or 3',
//       });
//     }
//   }

//   return {
//     isValid: missingFields.length === 0 && invalidFields.length === 0,
//     missingFields,
//     invalidFields,
//   };
// }





// @Injectable()
// export class ReportsService {
//   constructor(
//     @InjectRepository(Report)
//     private readonly reportsRepository: Repository<Report>,
//     @InjectRepository(Radiologist)
//     private readonly radiologistRepository: Repository<Radiologist>,
// @InjectRepository(Feature)
//     private readonly featureRepository: Repository<Feature>,
//     @InjectRepository(Patient)
//     private readonly patientRepository: Repository<Patient>,
//     private readonly ocrService: OcrService,
//       @InjectRepository(Assignment)
//   private readonly assignmentRepo: Repository<Assignment>,
//   @InjectRepository(Doctor)
//   private readonly doctorRepo: Repository<Doctor>,
//    @InjectRepository(CadicaResult)
//   private readonly cadicaResultRepository: Repository<CadicaResult>,

//   private readonly cadicaService: CadicaService
//   ,
//   private readonly firebaseService: FirebaseService,
//   private readonly httpService: HttpService,
//     @InjectRepository(AiResult)
//   private readonly aiResultRepository: Repository<AiResult>,
  
//   ) {}


//   //not used yet, but can be used in the future for admin to view reports by radiologist
//   async getReportsByRadiologistId(rid: number) {
//     const reports = await this.reportsRepository.find({
//       where: { radiologist: { radiologistid: rid } },
//       relations: ['patient', 'aiResult', 'radiologist'],
//       order: { uploadedat: 'DESC' },
//     });

//     if (reports.length === 0) {
//       throw new NotFoundException(
//         `No reports found for radiologist with ID ${rid}`,
//       );
//     }

//     return reports;
//   }




// async uploadAndAnalyzeFile(
//   radiologistId: number,
//   patientId: number,
//   file: Express.Multer.File,
//   comment?: string,
// ) {
//   if (!file) {
//     throw new BadRequestException('File is required');
//   }

//  const allowedMimeTypes = ['application/pdf'];
// const allowedExtensions = ['.pdf'];
//   const lowerName = file.originalname?.toLowerCase() || '';

//   const hasValidExtension = allowedExtensions.some((ext) =>
//     lowerName.endsWith(ext),
//   );

//   if (!allowedMimeTypes.includes(file.mimetype) || !hasValidExtension) {
//     throw new BadRequestException(
//       'Only PDF files are allowed',
//     );
//   }

//   if (!file.originalname || file.originalname.trim().length === 0) {
//     throw new BadRequestException('Invalid filename');
//   }

//   if (file.originalname.length > 255) {
//     throw new BadRequestException(
//       'Filename is too long. Maximum 255 characters allowed',
//     );
//   }

//   if (!patientId || Number.isNaN(patientId)) {
//     throw new BadRequestException('Valid patientId is required');
//   }

//   const radiologist = await this.radiologistRepository.findOne({
//     where: { radiologistid: radiologistId },
//   });

//   if (!radiologist) {
//     throw new NotFoundException('Radiologist not found');
//   }

//   const patient = await this.patientRepository.findOne({
//     where: { patientid: patientId },
//   });

//   if (!patient) {
//     throw new NotFoundException('Patient not found');
//   }

//   const report = this.reportsRepository.create({
//     filename: file.originalname,
//     filepath: file.originalname,
//     comment: comment?.trim() || null,
//     patient,
//     radiologist,
//   });

//   const savedReport = await this.reportsRepository.save(report);

//   const ocrResult = await this.ocrService.processFile(file);

// const toIntOrNull = (value: any): number | null => {
//   if (value === null || value === undefined || value === '') return null;

//   const num = Number(value);

//   if (!Number.isFinite(num)) return null;

//   return Math.round(num);
// };

// const toFloatOrNull = (value: any): number | null => {
//   if (value === null || value === undefined || value === '') return null;

//   const num = Number(value);

//   if (!Number.isFinite(num)) return null;

//   return num;
// };

// const featureData = {
//   id_number: ocrResult.fields?.id_number ?? null,

//   age: toIntOrNull(ocrResult.fields?.age),
//   gender: toIntOrNull(ocrResult.fields?.gender),
//   height: toIntOrNull(ocrResult.fields?.height),
//   weight: toFloatOrNull(ocrResult.fields?.weight),

//   ap_hi: toIntOrNull(ocrResult.fields?.ap_hi),
//   ap_lo: toIntOrNull(ocrResult.fields?.ap_lo),
//   cholesterol: toIntOrNull(ocrResult.fields?.cholesterol),
//   gluc: toIntOrNull(ocrResult.fields?.gluc),
//   smoke: toIntOrNull(ocrResult.fields?.smoke),
//   alco: toIntOrNull(ocrResult.fields?.alco),
//   active: toIntOrNull(ocrResult.fields?.active),
//   cardio: toIntOrNull(ocrResult.fields?.cardio),

//   report: savedReport,
// } as any;

// const feature = this.featureRepository.create(featureData);
// const savedFeature = await this.featureRepository.save(feature);
// // ── Auto Prediction ───────────────────────────────────────────────
// let aiPredictionResult: AiPredictionResult = null;

// try {
//   const ageInYears = Number(savedFeature.age);

//   const ageInDays = Number.isFinite(ageInYears)
//     ? Math.round(ageInYears * 365.25)
//     : null;

//   const predictionPayload = {
//     age: ageInYears,
//     gender: savedFeature.gender,
//     height: savedFeature.height,
//     weight: savedFeature.weight,
//     ap_hi: savedFeature.ap_hi,
//     ap_lo: savedFeature.ap_lo,
//     cholesterol: savedFeature.cholesterol,
//     gluc: savedFeature.gluc,
//     smoke: savedFeature.smoke,
//     alco: savedFeature.alco,
//     active: savedFeature.active,
//   };

//   const validation = validatePredictionPayload(predictionPayload);

//   if (!validation.isValid) {
//     aiPredictionResult = {
//       generated: false,
//       reason: 'Prediction fields are missing or invalid',
//       missingFields: validation.missingFields,
//       invalidFields: validation.invalidFields,
//     };
//   } else {
//     const pythonApiUrl =
//       process.env.PYTHON_API_URL || 'http://localhost:8000';

//     const response = await firstValueFrom(
//       this.httpService.post(`${pythonApiUrl}/predict`, predictionPayload),
//     );

//     const result = response.data;

//     if (!result || typeof result !== 'object') {
//       aiPredictionResult = {
//         generated: false,
//         reason: 'Prediction API returned empty or invalid response',
//         apiResponse: result,
//       };
//     } else if (
//       result.prediction === undefined ||
//       result.prediction === null ||
//       result.probability === undefined ||
//       result.probability === null
//     ) {
//       aiPredictionResult = {
//         generated: false,
//         reason: 'Prediction API response is missing prediction/probability',
//         apiResponse: result,
//       };
//     } else if (
//       ![0, 1].includes(Number(result.prediction)) ||
//       !Number.isFinite(Number(result.probability))
//     ) {
//       aiPredictionResult = {
//         generated: false,
//         reason: 'Prediction API returned invalid prediction/probability values',
//         apiResponse: result,
//       };
//     } else {
//       let aiResult = await this.aiResultRepository.findOne({
//         where: { reportid: savedReport.reportid },
//       });

//       if (!aiResult) {
//         aiResult = this.aiResultRepository.create({
//           reportid: savedReport.reportid,
//         });
//       }

//       aiResult.prediction = Number(result.prediction);
//       aiResult.probability = Number(result.probability);
//       aiResult.classification =
//         Number(result.prediction) === 1 ? 'High Risk' : 'Low Risk';
//       aiResult.modelname = 'CardioModelV1';
//       aiResult.keyparameters = `BP: ${savedFeature.ap_hi}/${savedFeature.ap_lo}, Cholesterol: ${savedFeature.cholesterol}, Glucose: ${savedFeature.gluc}`;
//       aiResult.remarks =
//         Number(result.prediction) === 1
//           ? 'Predicted high cardiovascular risk'
//           : 'Predicted low cardiovascular risk';

//       const savedAiResult = await this.aiResultRepository.save(aiResult);

//       aiPredictionResult = {
//         generated: true,
//         aiResult: savedAiResult,
//       };
//     }
//   }
// } catch (error) {
//   console.error(
//     'Auto prediction failed:',
//     error?.response?.data || error?.message || error,
//   );

//   aiPredictionResult = {
//     generated: false,
//     reason: 'Auto prediction failed',
//     error: {
//       message:
//         error?.response?.data?.message ||
//         error?.response?.data?.detail ||
//         error?.message ||
//         'Unknown error',
//       status: error?.response?.status ?? null,
//       data: error?.response?.data ?? null,
//     },
//   };
// }

//   // ── Auto-send to doctor ───────────────────────────────────────────
//   const assignments = await this.assignmentRepo.find({
//     where: { patient: { patientid: patientId } },
//     relations: ['doctor'],
//     order: { assignmentid: 'DESC' },
//   });

//   const assignment = assignments[0];

//   if (!assignment) {
//     return {
//       message: 'File processed, prediction attempted, and saved successfully',
//       report: savedReport,
//       feature: savedFeature,
//       ocrResult,
//       aiPredictionResult,
//       notification: {
//         sent: false,
//         reason: 'No doctor assigned to this patient',
//       },
//     };
//   }

//   if (!assignment.doctor) {
//     return {
//       message: 'File processed, prediction attempted, and saved successfully',
//       report: savedReport,
//       feature: savedFeature,
//       ocrResult,
//       aiPredictionResult,
//       notification: {
//         sent: false,
//         reason: 'Assignment exists but doctor record is missing',
//       },
//     };
//   }

//   const doctor = assignment.doctor;

//   if (!doctor.fcmtoken?.trim()) {
//     return {
//       message: 'File processed, prediction attempted, and saved successfully',
//       report: savedReport,
//       feature: savedFeature,
//       ocrResult,
//       aiPredictionResult,
//       notification: {
//         sent: false,
//         reason: `Doctor "${doctor.fullname}" has no FCM token registered. Doctor may not have logged in on mobile.`,
//       },
//     };
//   }

//   try {
//     await this.firebaseService.sendReportToDoctor({
//       fcmToken: doctor.fcmtoken,
//       doctorName: doctor.fullname,
//       patientName: patient.fullname,
//       reportId: savedReport.reportid,
//       radiologistName: radiologist.fullname,
//       comment:
//         savedReport.comment ??
//         (aiPredictionResult?.generated
//           ? 'Report uploaded and AI prediction generated.'
//           : 'Report uploaded. AI prediction could not be generated automatically.'),
//     });

//     return {
//       message: aiPredictionResult?.generated
//         ? 'File processed, prediction generated, saved, and sent to doctor successfully'
//         : 'File processed and saved. Prediction was attempted but not generated. Report sent to doctor successfully',
//       report: savedReport,
//       feature: savedFeature,
//       ocrResult,
//       aiPredictionResult,
//       notification: {
//         sent: true,
//         sentToDoctor: doctor.fullname,
//         doctorId: doctor.doctorid,
//       },
//     };
//   } catch (error) {
//     // Clear invalid token if Firebase rejects it
//     if (
//       error?.errorInfo?.code === 'messaging/invalid-argument' ||
//       error?.errorInfo?.code === 'messaging/registration-token-not-registered'
//     ) {
//       doctor.fcmtoken = null;
//       await this.doctorRepo.save(doctor);
//     }

//     return {
//       message: 'File processed, prediction attempted, and saved successfully',
//       report: savedReport,
//       feature: savedFeature,
//       ocrResult,
//       aiPredictionResult,
//       notification: {
//         sent: false,
//         reason: 'Firebase notification failed',
//         firebaseErrorCode: error?.errorInfo?.code ?? 'UNKNOWN',
//         firebaseErrorMessage: error?.message ?? 'Unknown Firebase error',
//       },
//     };
//   }
// }
// // get all reports by patient id
// async getReportsByPatientId(patientId: number) {
//   if (!patientId || Number.isNaN(Number(patientId))) {
//     throw new BadRequestException('Valid patientId is required');
//   }

//   const reports = await this.reportsRepository.find({
//     where: {
//       patient: { patientid: patientId },
//     },
//     relations: ['patient', 'radiologist', 'feature', 'aiResult'],
//     order: {
//       uploadedat: 'DESC',
//     },
//   });

//   if (!reports.length) {
//     throw new NotFoundException(
//       `No reports found for patient with ID ${patientId}`,
//     );
//   }

//   return reports;
// }


// async getAllReports() {
//   const reports = await this.reportsRepository.find({
//     relations: ['patient', 'radiologist', 'feature', 'aiResult'],
//     order: { uploadedat: 'DESC' },
//   });

//   return {
//     message: 'Reports fetched successfully',
//     total: reports.length,
//     reports: reports.map((report) => ({
//       reportid: report.reportid,
//       filename: report.filename,
//       comment: report.comment,
//       uploadedat: report.uploadedat,
//       patient: {
//         patientid: report.patient?.patientid,
//         fullname: report.patient?.fullname,
//         email: report.patient?.email,
//       },
//       radiologist: {
//         radiologistid: report.radiologist?.radiologistid,
//         fullname: report.radiologist?.fullname,
//       },
//       feature: report.feature
//         ? {
//             age: report.feature.age,
//             gender: report.feature.gender,
//             height: report.feature.height,
//             weight: report.feature.weight,
//             ap_hi: report.feature.ap_hi,
//             ap_lo: report.feature.ap_lo,
//             cholesterol: report.feature.cholesterol,
//             gluc: report.feature.gluc,
//             smoke: report.feature.smoke,
//             alco: report.feature.alco,
//             active: report.feature.active,
//             cardio: report.feature.cardio,
//           }
//         : null,
//       aiResult: report.aiResult
//         ? {
//             prediction: report.aiResult.prediction,
//             probability: report.aiResult.probability,
//             classification: report.aiResult.classification,
//             remarks: report.aiResult.remarks,
//           }
//         : null,
//     })),
//   };
// }

// }



import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import { HttpService } from '@nestjs/axios';

import { Report } from 'src/entities/entities/Report';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { Feature } from 'src/entities/entities/Feature';
import { Patient } from 'src/entities/entities/Patient';
import { Assignment } from 'src/entities/entities/Assignment';
import { Doctor } from 'src/entities/entities/Doctor';
import { CadicaResult } from 'src/entities/entities/CadicaResult';
import { AiResult } from 'src/entities/entities/AiResult';

import { OcrService } from 'src/ocr/ocr.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { CadicaService } from 'src/cadica/cadica.service';

// ─── Constants ───────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = ['application/pdf'];
const ALLOWED_EXTENSIONS = ['.pdf'];
const MAX_FILENAME_LENGTH = 255;

const BINARY_FIELDS = ['smoke', 'alco', 'active'] as const;
const CATEGORY_FIELDS = ['cholesterol', 'gluc'] as const;
const REQUIRED_PREDICTION_FIELDS = [
  'age', 'gender', 'height', 'weight',
  'ap_hi', 'ap_lo', 'cholesterol', 'gluc',
  'smoke', 'alco', 'active',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface InvalidField {
  field: string;
  value: any;
  reason: string;
}

interface ValidationResult {
  isValid: boolean;
  missingFields: string[];
  invalidFields: InvalidField[];
}

type AiPredictionResult =
  | { generated: true; aiResult: AiResult }
  | {
      generated: false;
      reason: string;
      missingFields?: string[];
      invalidFields?: InvalidField[];
      apiResponse?: any;
      error?: {
        message: string;
        status: number | null;
        data: any;
      };
    };

interface NotificationResult {
  sent: boolean;
  reason?: string;
  sentToDoctor?: string;
  doctorId?: number;
  firebaseErrorCode?: string;
  firebaseErrorMessage?: string;
}

export interface UploadAnalyzeResponse {
  message: string;
  report: Report;
  feature: Feature;
  ocrResult: any;
  aiPredictionResult: AiPredictionResult;
  notification: NotificationResult;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidFiniteNumber(value: any): boolean {
  return value !== null && value !== undefined && Number.isFinite(Number(value));
}

/** Round to nearest integer, return null if missing/invalid */
function toIntOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.round(num) : null;
}

/** Keep decimal precision, return null if missing/invalid */
function toFloatOrNull(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function validatePredictionPayload(payload: Record<string, any>): ValidationResult {
  const missingFields = REQUIRED_PREDICTION_FIELDS.filter(
    (field) => payload[field] === null || payload[field] === undefined,
  );

  const invalidFields: InvalidField[] = [];

  const addInvalid = (field: string, value: any, reason: string) =>
    invalidFields.push({ field, value, reason });

  for (const field of REQUIRED_PREDICTION_FIELDS) {
    const value = payload[field];
    if (value === null || value === undefined) continue;
    if (!isValidFiniteNumber(value)) {
      addInvalid(field, value, 'Value must be a valid number');
    }
  }

  const positiveFields: Array<[string, string]> = [
    ['age', 'Age must be greater than 0'],
    ['height', 'Height must be greater than 0'],
    ['weight', 'Weight must be greater than 0'],
    ['ap_hi', 'Systolic BP must be greater than 0'],
    ['ap_lo', 'Diastolic BP must be greater than 0'],
  ];

  for (const [field, reason] of positiveFields) {
    if (isValidFiniteNumber(payload[field]) && Number(payload[field]) <= 0) {
      addInvalid(field, payload[field], reason);
    }
  }

  for (const field of BINARY_FIELDS) {
    const val = payload[field];
    if (val !== null && val !== undefined && ![0, 1].includes(Number(val))) {
      addInvalid(field, val, 'Value must be 0 or 1');
    }
  }

  if (
    payload.gender !== null &&
    payload.gender !== undefined &&
    ![1, 2].includes(Number(payload.gender))
  ) {
    addInvalid('gender', payload.gender, 'Gender must be 1 or 2');
  }

  for (const field of CATEGORY_FIELDS) {
    const val = payload[field];
    if (val !== null && val !== undefined && ![1, 2, 3].includes(Number(val))) {
      addInvalid(field, val, 'Value must be 1, 2, or 3');
    }
  }

  return {
    isValid: missingFields.length === 0 && invalidFields.length === 0,
    missingFields,
    invalidFields,
  };
}

function validateFile(file: Express.Multer.File): void {
  if (!file) {
    throw new BadRequestException('File is required');
  }

  const originalName = file.originalname ?? '';

  if (!originalName || originalName.trim().length === 0) {
    throw new BadRequestException('Invalid filename');
  }

  if (originalName.length > MAX_FILENAME_LENGTH) {
    throw new BadRequestException(
      `Filename is too long. Maximum ${MAX_FILENAME_LENGTH} characters allowed`,
    );
  }

  const ext = path.extname(originalName).toLowerCase();
  const hasValidExtension = ALLOWED_EXTENSIONS.includes(ext);
  const hasValidMime = ALLOWED_MIME_TYPES.includes(file.mimetype);

  if (!hasValidMime || !hasValidExtension) {
    throw new BadRequestException('Only PDF files are allowed');
  }
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private readonly reportsRepository: Repository<Report>,
    @InjectRepository(Radiologist)
    private readonly radiologistRepository: Repository<Radiologist>,
    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(CadicaResult)
    private readonly cadicaResultRepository: Repository<CadicaResult>,
    @InjectRepository(AiResult)
    private readonly aiResultRepository: Repository<AiResult>,
    private readonly ocrService: OcrService,
    private readonly firebaseService: FirebaseService,
    private readonly cadicaService: CadicaService,
    private readonly httpService: HttpService,
  ) {}

  // ── Public Methods ──────────────────────────────────────────────────────────

  /** Admin: get all reports for a specific radiologist */
  async getReportsByRadiologistId(radiologistId: number): Promise<Report[]> {
    if (!radiologistId || Number.isNaN(radiologistId)) {
      throw new BadRequestException('Valid radiologistId is required');
    }

    const reports = await this.reportsRepository.find({
      where: { radiologist: { radiologistid: radiologistId } },
      relations: ['patient', 'aiResult', 'radiologist'],
      order: { uploadedat: 'DESC' },
    });

    if (!reports.length) {
      throw new NotFoundException(
        `No reports found for radiologist with ID ${radiologistId}`,
      );
    }

    return reports;
  }

// Get all reports for a specific patient with assigned doctor
async getReportsByPatientId(doctorId: number, patientId: number) {
  if (!patientId || Number.isNaN(Number(patientId))) {
    throw new BadRequestException('Valid patientId is required');
  }

  // 1. Check if the patient exists in the database
  const patient = await this.patientRepository.findOne({
    where: { patientid: patientId },
  });

  if (!patient) {
    throw new NotFoundException(`Patient with ID ${patientId} not found`);  // If patient does not exist, return error
  }

  try {
    // 2. Fetch reports for the specific patient, assigned to the doctor
    const reports = await this.reportsRepository.find({
      where: {
        patient: {
          patientid: patientId,  // Filter reports by patient ID
          assignments: {
            doctor: { doctorid: doctorId },  // Filter reports by assigned doctor
          },
        },
      },
      relations: [
        'patient',
        'patient.assignments',
        'patient.assignments.doctor',
        'radiologist',
        'aiResult',  // Fetch AI result relation
      ],
      order: {
        uploadedat: 'DESC',  // Ensure most recent reports are fetched first
      },
    });

    if (!reports.length) {
      throw new NotFoundException(
        `No reports found for patient with ID ${patientId}`,
      );  // Handle case where no reports are found
    }

    return {
      message: 'Reports fetched successfully',
      total: reports.length,
      reports: reports.map((report) => {
        const assignments = report.patient?.assignments || [];

        // Get the most recent doctor assignment for the patient
        const latestAssignment = assignments
          .filter((assignment) => assignment.doctor)
          .sort((a, b) => {
            const dateA = a.assignedat ? new Date(a.assignedat).getTime() : 0;
            const dateB = b.assignedat ? new Date(b.assignedat).getTime() : 0;

            if (dateB !== dateA) return dateB - dateA;
            return b.assignmentid - a.assignmentid;
          })[0];

        const assignedDoctor = latestAssignment?.doctor
          ? {
              doctorid: latestAssignment.doctor.doctorid,
              fullname: latestAssignment.doctor.fullname,
              specialization: latestAssignment.doctor.specialization,
              email: latestAssignment.doctor.email,
              experience: latestAssignment.doctor.experience,
              contactnumber: latestAssignment.doctor.contactnumber,
              status: latestAssignment.doctor.status,
              assignedat: latestAssignment.assignedat,
            }
          : null;

        return {
          reportid: report.reportid,
          filename: report.filename,
          filepath: report.filepath,
          comment: report.comment,
          uploadedat: report.uploadedat,

          // Spread patient properties here (no duplicate key)
          ...report.patient,

          // Radiologist info
          radiologist: report.radiologist
            ? {
                radiologistid: report.radiologist.radiologistid,
                fullname: report.radiologist.fullname,
                email: report.radiologist.email,
                contactnumber: report.radiologist.contactnumber,
                status: report.radiologist.status,
                createdat: report.radiologist.createdat,
              }
            : null,

          // Assigned doctor info
          assignedDoctor,

          // AI result for the report
          aiResult: report.aiResult
            ? {
                airesultid: report.aiResult.airesultid,
                prediction: report.aiResult.prediction,
                probability: report.aiResult.probability,
                classification: report.aiResult.classification,
                keyparameters: report.aiResult.keyparameters,
                remarks: report.aiResult.remarks,
                modelname: report.aiResult.modelname,
                processedat: report.aiResult.processedat,
              }
            : null,
        };
      }),
    };
  } catch (error) {
    // Handle any other unexpected errors
    throw new InternalServerErrorException('Error fetching reports', error.message);
  }
}
/** Get all reports without AI result and feature, but with assigned doctor */
async getAllReports() {
  const reports = await this.reportsRepository.find({
    relations: [
      'patient',
      'patient.assignments',
      'patient.assignments.doctor',
      'radiologist',
    ],
    order: {
      uploadedat: 'ASC',
    },
  });

  return {
    message: 'Reports fetched successfully',
    total: reports.length,
    reports: reports.map((report) => {
      const assignments = report.patient?.assignments || [];

      // latest assignment based on assignedat / assignmentid
      const latestAssignment = assignments
        .filter((assignment) => assignment.doctor)
        .sort((a, b) => {
          const dateA = a.assignedat ? new Date(a.assignedat).getTime() : 0;
          const dateB = b.assignedat ? new Date(b.assignedat).getTime() : 0;

          if (dateB !== dateA) return dateB - dateA;

          return b.assignmentid - a.assignmentid;
        })[0];

      const assignedDoctor = latestAssignment?.doctor
        ? {
            doctorid: latestAssignment.doctor.doctorid,
            fullname: latestAssignment.doctor.fullname,
            specialization: latestAssignment.doctor.specialization,
            email: latestAssignment.doctor.email,
            experience: latestAssignment.doctor.experience,
            contactnumber: latestAssignment.doctor.contactnumber,
            status: latestAssignment.doctor.status,
            assignedat: latestAssignment.assignedat,
          }
        : null;

      return {
        reportid: report.reportid,
        filename: report.filename,
        comment: report.comment,
        uploadedat: report.uploadedat,

        patient: report.patient
          ? {
              patientid: report.patient.patientid,
              fullname: report.patient.fullname,
              email: report.patient.email,
              age: report.patient.age,
              gender: report.patient.gender,
              contactnumber: report.patient.contactnumber,
              address: report.patient.address,
              createdat: report.patient.createdat,
            }
          : null,

        radiologist: report.radiologist
          ? {
              radiologistid: report.radiologist.radiologistid,
              fullname: report.radiologist.fullname,
              email: report.radiologist.email,
              contactnumber: report.radiologist.contactnumber,
              status: report.radiologist.status,
              createdat: report.radiologist.createdat,
            }
          : null,

        assignedDoctor,
      };
    }),
  };
}

  /** Upload PDF, run OCR, attempt AI prediction, notify doctor */
  async uploadAndAnalyzeFile(
    radiologistId: number,
    patientId: number,
    file: Express.Multer.File,
    comment?: string,
  ): Promise<UploadAnalyzeResponse> {
    // ── 1. Validate inputs ──────────────────────────────────────────────────
    validateFile(file);

    if (!patientId || Number.isNaN(patientId)) {
      throw new BadRequestException('Valid patientId is required');
    }

    if (!radiologistId || Number.isNaN(radiologistId)) {
      throw new BadRequestException('Valid radiologistId is required');
    }

    // ── 2. Load entities ────────────────────────────────────────────────────
    const [radiologist, patient] = await Promise.all([
      this.radiologistRepository.findOne({
        where: { radiologistid: radiologistId },
      }),
      this.patientRepository.findOne({ where: { patientid: patientId } }),
    ]);

    if (!radiologist) {
      throw new NotFoundException(`Radiologist with ID ${radiologistId} not found`);
    }

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    // ── 3. Save report ──────────────────────────────────────────────────────
    const savedReport = await this.reportsRepository.save(
      this.reportsRepository.create({
        filename: file.originalname,
        filepath: file.originalname,
        comment: comment?.trim() || null,
        patient,
        radiologist,
      }),
    );

    // ── 4. OCR ──────────────────────────────────────────────────────────────
    let ocrResult: Awaited<ReturnType<OcrService['processFile']>>;
    try {
      ocrResult = await this.ocrService.processFile(file);
    } catch (err) {
      this.logger.error(`OCR failed for report ${savedReport.reportid}`, err);
      throw new InternalServerErrorException('OCR processing failed. Please try again.');
    }

    // ── 5. Save features ────────────────────────────────────────────────────
    // weight → float (decimal precision needed)
    // all others → int (rounded, matches dataset schema)
    const fields = ocrResult.fields ?? {};
const rawText = (ocrResult.raw_text ?? '').toLowerCase();
// Raw text mein field ka label hai ya nahi check karta hai
const mentioned = (keywords: string[]): boolean =>
  keywords.some((kw) => rawText.includes(kw.toLowerCase()));

// Sirf tab value lo jab label text mein ho, warna null
const safeInt = (value: any, keywords: string[]): number | null =>
  mentioned(keywords) ? toIntOrNull(value) : null;

const safeFloat = (value: any, keywords: string[]): number | null =>
  mentioned(keywords) ? toFloatOrNull(value) : null;


  const featureEntity = new Feature();
featureEntity.id_number   = fields.id_number ?? null;
featureEntity.age         = safeInt(fields.age,         ['age', 'patient age', 'years']);
featureEntity.gender      = safeInt(fields.gender,      ['gender', 'sex', 'male', 'female']);
featureEntity.height      = safeInt(fields.height,      ['height', 'stature']);
featureEntity.weight      = safeFloat(fields.weight,    ['weight', 'body weight']);
featureEntity.ap_hi       = safeInt(fields.ap_hi,       ['systolic', 'bp', 'blood pressure']);
featureEntity.ap_lo       = safeInt(fields.ap_lo,       ['diastolic', 'bp', 'blood pressure']);
featureEntity.cholesterol = safeInt(fields.cholesterol, ['cholesterol', 'lipid']);
featureEntity.gluc        = safeInt(fields.gluc,        ['glucose', 'sugar', 'rbs', 'fbs']);
featureEntity.smoke       = safeInt(fields.smoke,       ['smoke', 'smoking', 'tobacco', 'cigarette']);
featureEntity.alco        = safeInt(fields.alco,        ['alcohol', 'drinking', 'alco']);
featureEntity.active      = safeInt(fields.active,      ['activity', 'physical activity', 'exercise', 'active']);
featureEntity.cardio      = safeInt(fields.cardio,      ['cardio', 'cardiovascular', 'heart disease', 'cardiac', 'cvd']);
featureEntity.report      = savedReport;

    const savedFeature: Feature = await this.featureRepository.save(featureEntity);

    // ── 6. AI Prediction ────────────────────────────────────────────────────
    const aiPredictionResult = await this.runAiPrediction(savedReport, savedFeature);

    // ── 7. Notify assigned doctor ───────────────────────────────────────────
    const notificationResult = await this.notifyAssignedDoctor({
      patientId,
      patient,
      radiologist,
      savedReport,
      aiPredictionResult,
    });

    return {
      message: this.buildSuccessMessage(aiPredictionResult, notificationResult),
      report: savedReport,
      feature: savedFeature,
      ocrResult,
      aiPredictionResult,
      notification: notificationResult,
    };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────────

  private async runAiPrediction(
    savedReport: Report,
    savedFeature: Feature,
  ): Promise<AiPredictionResult> {
    try {
      // All fields already int in DB — weight is float, send as-is
      const predictionPayload = {
        age:         savedFeature.age,
        gender:      savedFeature.gender,
        height:      savedFeature.height,
        weight:      savedFeature.weight,   // float
        ap_hi:       savedFeature.ap_hi,
        ap_lo:       savedFeature.ap_lo,
        cholesterol: savedFeature.cholesterol,
        gluc:        savedFeature.gluc,
        smoke:       savedFeature.smoke,
        alco:        savedFeature.alco,
        active:      savedFeature.active,
      };

      const validation = validatePredictionPayload(predictionPayload);
      if (!validation.isValid) {
        return {
          generated: false,
          reason: 'Prediction fields are missing or invalid',
          missingFields: validation.missingFields,
          invalidFields: validation.invalidFields,
        };
      }

      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
      const response = await firstValueFrom(
        this.httpService.post(`${pythonApiUrl}/predict`, predictionPayload),
      );

      const result = response.data;

      if (!result || typeof result !== 'object') {
        return {
          generated: false,
          reason: 'Prediction API returned empty or invalid response',
          apiResponse: result,
        };
      }

      const prediction = result.prediction;
      const probability = result.probability;

      if (prediction === undefined || prediction === null) {
        return {
          generated: false,
          reason: 'Prediction API response is missing prediction field',
          apiResponse: result,
        };
      }

      if (probability === undefined || probability === null) {
        return {
          generated: false,
          reason: 'Prediction API response is missing probability field',
          apiResponse: result,
        };
      }

      if (![0, 1].includes(Number(prediction)) || !Number.isFinite(Number(probability))) {
        return {
          generated: false,
          reason: 'Prediction API returned invalid prediction/probability values',
          apiResponse: result,
        };
      }

      const isHighRisk = Number(prediction) === 1;

      const aiResult = await this.aiResultRepository.save(
        Object.assign(
          (await this.aiResultRepository.findOne({
            where: { reportid: savedReport.reportid },
          })) ?? this.aiResultRepository.create({ reportid: savedReport.reportid }),
          {
            prediction: Number(prediction),
            probability: Number(probability),
            classification: isHighRisk ? 'High Risk' : 'Low Risk',
            modelname: 'CardioModelV1',
            keyparameters: `BP: ${savedFeature.ap_hi}/${savedFeature.ap_lo}, Cholesterol: ${savedFeature.cholesterol}, Glucose: ${savedFeature.gluc}`,
            remarks: isHighRisk
              ? 'Predicted high cardiovascular risk'
              : 'Predicted low cardiovascular risk',
          },
        ),
      );

      return { generated: true, aiResult };
    } catch (error) {
      this.logger.error(
        `AI prediction failed for report ${savedReport.reportid}`,
        error?.response?.data ?? error?.message ?? error,
      );

      return {
        generated: false,
        reason: 'Auto prediction failed due to an unexpected error',
        error: {
          message:
            error?.response?.data?.message ??
            error?.response?.data?.detail ??
            error?.message ??
            'Unknown error',
          status: error?.response?.status ?? null,
          data: error?.response?.data ?? null,
        },
      };
    }
  }

  private async notifyAssignedDoctor(params: {
    patientId: number;
    patient: Patient;
    radiologist: Radiologist;
    savedReport: Report;
    aiPredictionResult: AiPredictionResult;
  }): Promise<NotificationResult> {
    const { patientId, patient, radiologist, savedReport, aiPredictionResult } = params;

    const assignments = await this.assignmentRepo.find({
      where: { patient: { patientid: patientId } },
      relations: ['doctor'],
      order: { assignmentid: 'DESC' },
    });

    const assignment = assignments[0];

    if (!assignment) {
      return { sent: false, reason: 'No doctor assigned to this patient' };
    }

    const doctor = assignment.doctor;

    if (!doctor) {
      return { sent: false, reason: 'Assignment exists but doctor record is missing' };
    }

    if (!doctor.fcmtoken?.trim()) {
      return {
        sent: false,
        reason: `Doctor "${doctor.fullname}" has no FCM token registered. Doctor may not have logged in on mobile.`,
      };
    }

    try {
      await this.firebaseService.sendReportToDoctor({
        fcmToken: doctor.fcmtoken,
        doctorName: doctor.fullname,
        patientName: patient.fullname,
        reportId: savedReport.reportid,
        radiologistName: radiologist.fullname,
        comment:
          savedReport.comment ??
          (aiPredictionResult?.generated
            ? 'Report uploaded and AI prediction generated.'
            : 'Report uploaded. AI prediction could not be generated automatically.'),
      });

      return {
        sent: true,
        sentToDoctor: doctor.fullname,
        doctorId: doctor.doctorid,
      };
    } catch (error) {
      const errorCode = error?.errorInfo?.code ?? 'UNKNOWN';

      if (
        errorCode === 'messaging/invalid-argument' ||
        errorCode === 'messaging/registration-token-not-registered'
      ) {
        this.logger.warn(
          `Clearing invalid FCM token for doctor ${doctor.doctorid} (${doctor.fullname})`,
        );
        doctor.fcmtoken = null;
        await this.doctorRepo.save(doctor);
      }

      this.logger.error(
        `Firebase notification failed for doctor ${doctor.doctorid}`,
        error?.message,
      );

      return {
        sent: false,
        reason: 'Firebase notification failed',
        firebaseErrorCode: errorCode,
        firebaseErrorMessage: error?.message ?? 'Unknown Firebase error',
      };
    }
  }

  private buildSuccessMessage(
    aiResult: AiPredictionResult,
    notification: { sent: boolean },
  ): string {
    const predictionPart = aiResult?.generated
      ? 'AI prediction generated'
      : 'AI prediction could not be generated';

    const notificationPart = notification.sent
      ? 'report sent to doctor'
      : 'doctor notification skipped';

    return `File processed successfully — ${predictionPart}, ${notificationPart}.`;
  }

  private formatReportSummary(report: Report) {
    return {
      reportid: report.reportid,
      filename: report.filename,
      comment: report.comment,
      uploadedat: report.uploadedat,
      patient: {
        patientid: report.patient?.patientid,
        fullname: report.patient?.fullname,
        email: report.patient?.email,
      },
      radiologist: {
        radiologistid: report.radiologist?.radiologistid,
        fullname: report.radiologist?.fullname,
      },
      feature: report.feature
        ? {
            age: report.feature.age,
            gender: report.feature.gender,
            height: report.feature.height,
            weight: report.feature.weight,
            ap_hi: report.feature.ap_hi,
            ap_lo: report.feature.ap_lo,
            cholesterol: report.feature.cholesterol,
            gluc: report.feature.gluc,
            smoke: report.feature.smoke,
            alco: report.feature.alco,
            active: report.feature.active,
            cardio: report.feature.cardio,
          }
        : null,
      aiResult: report.aiResult
        ? {
            prediction: report.aiResult.prediction,
            probability: report.aiResult.probability,
            classification: report.aiResult.classification,
            remarks: report.aiResult.remarks,
          }
        : null,
    };
  }
}