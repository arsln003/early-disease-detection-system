import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

import { StrokeReport } from 'src/entities/entities/StrokeReport';
import { StrokeResult } from 'src/entities/entities/StrokeResult';
import { Patient } from 'src/entities/entities/Patient';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { Assignment } from 'src/entities/entities/Assignment';
import { Doctor } from 'src/entities/entities/Doctor';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class StrokeService {
  constructor(
    @InjectRepository(StrokeReport)
    private readonly strokeReportRepository: Repository<StrokeReport>,

    @InjectRepository(StrokeResult)
    private readonly strokeResultRepository: Repository<StrokeResult>,

    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    @InjectRepository(Radiologist)
    private readonly radiologistRepository: Repository<Radiologist>,

    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

    private readonly firebaseService: FirebaseService,
  ) {}

  async uploadStrokeImageAndPredict(
    radiologistId: number,
    patientId: number,
    file: Express.Multer.File,
    comment?: string,
  ) {
    if (!file) {
      throw new BadRequestException('Stroke CT image is required');
    }

    if (!patientId || Number.isNaN(patientId)) {
      throw new BadRequestException('Valid patientId is required');
    }

    const allowedMimeTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    const allowedExtensions = ['.png', '.jpg', '.jpeg'];

    const lowerName = file.originalname?.toLowerCase() || '';
    const hasValidExtension = allowedExtensions.some((ext) =>
      lowerName.endsWith(ext),
    );

    if (!allowedMimeTypes.includes(file.mimetype) || !hasValidExtension) {
      throw new BadRequestException('Only PNG, JPG, and JPEG CT images are allowed');
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

    const uploadDir = path.join(process.cwd(), 'uploads', 'stroke');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const fileExt = path.extname(file.originalname);
    const safeFilename = `${randomUUID()}${fileExt}`;

    const relativeFilePath = path.join('uploads', 'stroke', safeFilename);
    const absoluteFilePath = path.join(process.cwd(), relativeFilePath);

    fs.writeFileSync(absoluteFilePath, file.buffer);

    const strokeReport = this.strokeReportRepository.create({
      filename: file.originalname,
      filepath: relativeFilePath,
      mimetype: file.mimetype,
      size: file.size,
      comment: comment?.trim() || null,
      status: 'PENDING',
      patient,
      radiologist,
    });

    const savedStrokeReport =
      await this.strokeReportRepository.save(strokeReport);

    let strokeModelResult: any = null;
    let savedStrokeResult: StrokeResult | null = null;

    try {
      const pythonApiUrl =
        process.env.PYTHON_API_URL || 'http://localhost:8000';

      const formData = new FormData();

      formData.append('file', fs.createReadStream(absoluteFilePath), {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await axios.post(
        `${pythonApiUrl}/stroke/predict?report_id=${savedStrokeReport.strokereportid}`,
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      strokeModelResult = response.data;

      savedStrokeResult = await this.strokeResultRepository.save(
        this.strokeResultRepository.create({
          strokereportid: savedStrokeReport.strokereportid,

          prediction: strokeModelResult?.prediction ?? null,
          predictionClass: strokeModelResult?.prediction_class ?? null,
          confidence: strokeModelResult?.confidence ?? null,
          probabilities: strokeModelResult?.probabilities ?? null,
          segmentationGenerated:
            strokeModelResult?.segmentation_generated ?? null,

          resultImage: strokeModelResult?.result_image ?? null,
          overlayImage: strokeModelResult?.overlay_image ?? null,
          resultImageUrl: strokeModelResult?.result_image_url ?? null,
          overlayImageUrl: strokeModelResult?.overlay_image_url ?? null,

          pythonReportId: strokeModelResult?.report_id ?? null,
          device: strokeModelResult?.device ?? null,

          rawResult: JSON.stringify(strokeModelResult),
          modelname: 'STROKE_FINAL_MODEL_V2',
        }),
      );

      savedStrokeReport.status = 'PREDICTED';
      await this.strokeReportRepository.save(savedStrokeReport);
    } catch (error) {
      console.error(
        'Stroke prediction failed:',
        error?.response?.data || error?.message || error,
      );

      savedStrokeReport.status = 'PREDICTION_FAILED';
      await this.strokeReportRepository.save(savedStrokeReport);

      throw new InternalServerErrorException({
        message: 'Stroke image uploaded but prediction failed',
        strokeReportId: savedStrokeReport.strokereportid,
        error:
          error?.response?.data ||
          error?.message ||
          'Unknown stroke prediction error',
      });
    }

    const assignments = await this.assignmentRepository.find({
      where: { patient: { patientid: patientId } },
      relations: ['doctor'],
      order: { assignmentid: 'DESC' },
    });

    const assignment = assignments[0];
    const doctor = assignment?.doctor;

    let notification: any = {
      sent: false,
      reason: 'No doctor assigned to this patient',
    };

    if (doctor?.fcmtoken?.trim()) {
      try {
        await this.firebaseService.sendReportToDoctor({
          fcmToken: doctor.fcmtoken,
          doctorName: doctor.fullname,
          patientName: patient.fullname,
          reportId: savedStrokeReport.strokereportid,
          radiologistName: radiologist.fullname,
          comment:
            comment?.trim() ||
            `Stroke CT image prediction is ready for patient ${patient.fullname}.`,
        });

        notification = {
          sent: true,
          sentToDoctor: doctor.fullname,
          doctorId: doctor.doctorid,
        };
      } catch (error) {
        notification = {
          sent: false,
          reason: 'Firebase notification failed',
          firebaseErrorCode: error?.errorInfo?.code ?? 'UNKNOWN',
          firebaseErrorMessage: error?.message ?? 'Unknown Firebase error',
        };
      }
    } else if (doctor) {
      notification = {
        sent: false,
        reason: `Doctor "${doctor.fullname}" has no FCM token registered.`,
      };
    }

    return {
      message: 'Stroke image uploaded, predicted, and sent to assigned doctor successfully',
      patientId,
      strokeReport: savedStrokeReport,
      strokeResult: savedStrokeResult,
      modelResult: strokeModelResult,
      notification,
    };
  }




//get for doctor


async getStrokePredictionForDoctor(
  doctorId: number,
  strokeReportId: number,
) {
  if (!doctorId || Number.isNaN(Number(doctorId))) {
    throw new BadRequestException('Valid doctorId is required');
  }

  if (!strokeReportId || Number.isNaN(Number(strokeReportId))) {
    throw new BadRequestException('Valid strokeReportId is required');
  }

  const strokeReport = await this.strokeReportRepository.findOne({
    where: {
      strokereportid: strokeReportId,
    },
    relations: [
      'patient',
      'radiologist',
      'strokeResult',
    ],
  });

  if (!strokeReport) {
    throw new NotFoundException('Stroke report not found');
  }

  if (!strokeReport.patient) {
    throw new BadRequestException('Stroke report has no patient linked');
  }

  const assignment = await this.assignmentRepository.findOne({
    where: {
      doctor: { doctorid: doctorId },
      patient: { patientid: strokeReport.patient.patientid },
    },
    relations: ['doctor', 'patient'],
  });

  if (!assignment) {
    throw new BadRequestException(
      'You are not assigned to this patient, so you cannot view this stroke prediction',
    );
  }

  if (!strokeReport.strokeResult) {
    return {
      message: 'Stroke prediction has not been generated yet',
      strokeReportId: strokeReport.strokereportid,
      status: strokeReport.status,
      patient: strokeReport.patient,
      radiologist: strokeReport.radiologist
        ? {
            radiologistid: strokeReport.radiologist.radiologistid,
            fullname: strokeReport.radiologist.fullname,
            email: strokeReport.radiologist.email,
            contactnumber: strokeReport.radiologist.contactnumber,
            status: strokeReport.radiologist.status,
            createdat: strokeReport.radiologist.createdat,
          }
        : null,
      strokeResult: null,
    };
  }

  let modelResult: any = null;

  try {
    modelResult = strokeReport.strokeResult.rawResult
      ? JSON.parse(strokeReport.strokeResult.rawResult)
      : null;
  } catch {
    modelResult = strokeReport.strokeResult.rawResult;
  }

  return {
    message: 'Stroke prediction fetched successfully',
    strokeReportId: strokeReport.strokereportid,
    status: strokeReport.status,

    patient: strokeReport.patient
      ? {
          patientid: strokeReport.patient.patientid,
          fullname: strokeReport.patient.fullname,
          email: strokeReport.patient.email,
          age: strokeReport.patient.age,
          gender: strokeReport.patient.gender,
          contactnumber: strokeReport.patient.contactnumber,
          address: strokeReport.patient.address,
          createdat: strokeReport.patient.createdat,
        }
      : null,

    radiologist: strokeReport.radiologist
      ? {
          radiologistid: strokeReport.radiologist.radiologistid,
          fullname: strokeReport.radiologist.fullname,
          email: strokeReport.radiologist.email,
          contactnumber: strokeReport.radiologist.contactnumber,
          status: strokeReport.radiologist.status,
          createdat: strokeReport.radiologist.createdat,
        }
      : null,

    strokeResult: {
      strokeresultid: strokeReport.strokeResult.strokeresultid,
      strokereportid: strokeReport.strokeResult.strokereportid,

      prediction: strokeReport.strokeResult.prediction,
      predictionClass: strokeReport.strokeResult.predictionClass,
      confidence: strokeReport.strokeResult.confidence,
      probabilities: strokeReport.strokeResult.probabilities,

      segmentationGenerated:
        strokeReport.strokeResult.segmentationGenerated,

      resultImage: strokeReport.strokeResult.resultImage,
      resultImageUrl: strokeReport.strokeResult.resultImageUrl,

      overlayImage: strokeReport.strokeResult.overlayImage,
      overlayImageUrl: strokeReport.strokeResult.overlayImageUrl,

      pythonReportId: strokeReport.strokeResult.pythonReportId,
      device: strokeReport.strokeResult.device,

      modelname: strokeReport.strokeResult.modelname,
      processedat: strokeReport.strokeResult.processedat,
    },

    modelResult,
  };
}


async getAllStrokeReports() {
  const strokeReports = await this.strokeReportRepository.find({
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
    message: 'Stroke reports fetched successfully',
    total: strokeReports.length,
    strokeReports: strokeReports.map((report) => {
      const assignments = report.patient?.assignments || [];

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
        strokereportid: report.strokereportid,
        filename: report.filename,
        filepath: report.filepath,
        mimetype: report.mimetype,
        size: report.size,
        comment: report.comment,
        status: report.status,
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

async getStrokeReportsByPatientId(patientId: number) {
  if (!patientId || Number.isNaN(Number(patientId))) {
    throw new BadRequestException('Valid patientId is required');
  }

  const strokeReports = await this.strokeReportRepository.find({
    where: {
      patient: {
        patientid: patientId,
      },
    },
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

  if (!strokeReports.length) {
    throw new NotFoundException(
      `No stroke reports found for patient with ID ${patientId}`,
    );
  }

  return {
    message: 'Stroke reports fetched successfully',
    patientId,
    total: strokeReports.length,
    strokeReports: strokeReports.map((report) => {
      const assignments = report.patient?.assignments || [];

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
        strokereportid: report.strokereportid,
        filename: report.filename,
        filepath: report.filepath,
        mimetype: report.mimetype,
        size: report.size,
        comment: report.comment,
        status: report.status,
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


}