import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import FormData from 'form-data';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';



import { Assignment } from 'src/entities/entities/Assignment';
import { CadicaVideoReport } from 'src/entities/entities/CadicaVideoReport';
import { CadicaResult } from 'src/entities/entities/CadicaResult';

type CadicaVideoFile = {
  buffer: Buffer;
  filename: string;
  mimetype: string;
};

@Injectable()
export class CadicaService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(CadicaVideoReport)
    private readonly cadicaVideoReportRepository: Repository<CadicaVideoReport>,

    @InjectRepository(CadicaResult)
    private readonly cadicaResultRepository: Repository<CadicaResult>,
  ) {}

  async processMultipleVideoBuffers(
  files: CadicaVideoFile[],
  saveGradcam: boolean = true,
  cadicaVideoReportId: number,
) {
  if (!files || files.length === 0) {
    throw new BadRequestException(
      'At least one video is required for prediction',
    );
  }

  try {
    const formData = new FormData();

    for (const file of files) {
      formData.append('files', file.buffer, {
        filename: file.filename,
        contentType: file.mimetype || 'video/mp4',
      });
    }

    const response = await axios.post(
      `http://localhost:8000/cadica/predict?save_gradcam=${saveGradcam}&report_id=${cadicaVideoReportId}`,
      formData,
      {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      },
    );

    return response.data;
  } catch (error) {
    console.log('CADICA Python API error:', error?.response?.data || error);

    throw new InternalServerErrorException(
      error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        'CADICA model inference failed',
    );
  }
}

private buildFinalCadicaResult(cadicaModelResult: any) {
  const perVideo = Array.isArray(cadicaModelResult?.per_video)
    ? cadicaModelResult.per_video
    : [];

  const gradcamImages = perVideo.map((item) => ({
    video: item?.video ?? null,
    prediction: item?.prediction ?? null,
    probability: item?.probability ?? null,
    weight: item?.weight ?? null,
    gtLabel: item?.gt_label ?? null,
    correct: item?.correct ?? null,
    gradcamImg: item?.gradcam_img ?? null,
    gradcamImgUrl: item?.gradcam_img_url ?? null,
  }));

  return {
    verdict: cadicaModelResult?.verdict ?? null,

    confidence: cadicaModelResult?.confidence ?? null,

    weightedAvgProb: cadicaModelResult?.weighted_avg_prob ?? null,

    mostSuspiciousVideo:
      cadicaModelResult?.most_suspicious_video ?? null,

    mostSuspiciousProb:
      cadicaModelResult?.most_suspicious_prob ?? null,

    videosProcessed:
      cadicaModelResult?.videos_processed ?? perVideo.length ?? null,

    videosSkipped:
      cadicaModelResult?.videos_skipped ?? null,

    summaryImage:
      cadicaModelResult?.summary_image ?? null,

    summaryImageUrl:
      cadicaModelResult?.summary_image_url ?? null,

    gradcamImages,

    perVideo,
  };
}

  private hasCompleteCadicaResult(result: CadicaResult | null | undefined) {
    return (
      !!result &&
      !!result.verdict &&
      result.confidence !== null &&
      result.confidence !== undefined
    );
  }

  async predictCadicaVideoReport(
  doctorId: number,
  cadicaVideoReportId: number,
) {
  if (!cadicaVideoReportId || Number.isNaN(cadicaVideoReportId)) {
    throw new BadRequestException('Valid cadicaVideoReportId is required');
  }

  const cadicaVideoReport = await this.cadicaVideoReportRepository.findOne({
    where: { cadicavideoreportid: cadicaVideoReportId },
    relations: ['patient', 'radiologist', 'cadicaResult'],
  });

  if (!cadicaVideoReport) {
    throw new NotFoundException('CADICA video report not found');
  }

  if (!cadicaVideoReport.patient) {
    throw new BadRequestException('CADICA video report has no patient linked');
  }

  const assignment = await this.assignmentRepository.findOne({
    where: {
      doctor: { doctorid: doctorId },
      patient: { patientid: cadicaVideoReport.patient.patientid },
    },
    relations: ['doctor', 'patient'],
  });

  if (!assignment) {
    throw new ForbiddenException(
      'You are not assigned to this patient, so you cannot run prediction',
    );
  }

  if (this.hasCompleteCadicaResult(cadicaVideoReport.cadicaResult)) {
    let existingModelResult: any = null;

    try {
      existingModelResult = cadicaVideoReport.cadicaResult.rawResult
        ? JSON.parse(cadicaVideoReport.cadicaResult.rawResult)
        : null;
    } catch {
      existingModelResult = cadicaVideoReport.cadicaResult.rawResult;
    }

    return {
      message: 'CADICA prediction already exists for this video report',
      cadicaVideoReportId: cadicaVideoReport.cadicavideoreportid,
      patient: cadicaVideoReport.patient,
      radiologist: cadicaVideoReport.radiologist,
      cadicaResult: cadicaVideoReport.cadicaResult,
      modelResult: existingModelResult,
    };
  }

  if (cadicaVideoReport.cadicaResult) {
    await this.cadicaResultRepository.delete({
      cadicavideoreportid: cadicaVideoReport.cadicavideoreportid,
    });
  }

  if (!cadicaVideoReport.videos || cadicaVideoReport.videos.length === 0) {
    throw new BadRequestException(
      'No videos found in this CADICA video report',
    );
  }

  const videoFiles: CadicaVideoFile[] = cadicaVideoReport.videos.map(
    (video) => {
      const absoluteFilePath = path.join(process.cwd(), video.filepath);

      if (!fs.existsSync(absoluteFilePath)) {
        throw new NotFoundException(
          `Video file not found on server: ${video.filename}`,
        );
      }

      return {
        buffer: fs.readFileSync(absoluteFilePath),
        filename: video.filename,
        mimetype: video.mimetype || 'video/mp4',
      };
    },
  );

  const cadicaModelResult = await this.processMultipleVideoBuffers(
    videoFiles,
    true,
    cadicaVideoReportId
  );

  const finalResult = this.buildFinalCadicaResult(cadicaModelResult);
  const cadicaVideoReportIdValue = cadicaVideoReport.cadicavideoreportid;

  if (!cadicaVideoReportIdValue) {
    throw new BadRequestException('Invalid CADICA video report id');
  }

  const savedCadicaResult = await this.cadicaResultRepository.save(
    this.cadicaResultRepository.create({
      cadicavideoreportid: cadicaVideoReportIdValue,

      verdict: finalResult.verdict,
      confidence: finalResult.confidence,
      weightedAvgProb: finalResult.weightedAvgProb,
      mostSuspiciousVideo: finalResult.mostSuspiciousVideo,
      mostSuspiciousProb: finalResult.mostSuspiciousProb,
      videosProcessed: finalResult.videosProcessed,
      videosSkipped: finalResult.videosSkipped,

      summaryImage: finalResult.summaryImage,
      summaryImageUrl: finalResult.summaryImageUrl,
      gradcamImages: finalResult.gradcamImages,
      perVideo: finalResult.perVideo,

      rawResult: JSON.stringify(cadicaModelResult),
      modelname: 'CADICA_THIRD_MODEL_V2',
    }),
  );

  await this.cadicaVideoReportRepository.update(
    { cadicavideoreportid: cadicaVideoReportIdValue },
    { status: 'PREDICTED' },
  );

  return {
    message: 'CADICA prediction completed successfully',
    cadicaVideoReportId: cadicaVideoReportIdValue,
    patient: cadicaVideoReport.patient,
    radiologist: cadicaVideoReport.radiologist,
    cadicaResult: savedCadicaResult,
    modelResult: cadicaModelResult,
  };
}

async getCadicaPrediction(
  doctorId: number,
  cadicaVideoReportId: number,
) {
  if (!cadicaVideoReportId || Number.isNaN(cadicaVideoReportId)) {
    throw new BadRequestException('Valid cadicaVideoReportId is required');
  }

  const cadicaVideoReport = await this.cadicaVideoReportRepository.findOne({
    where: { cadicavideoreportid: cadicaVideoReportId },
    relations: ['patient', 'radiologist', 'cadicaResult'],
  });

  if (!cadicaVideoReport) {
    throw new NotFoundException('CADICA video report not found');
  }

  if (!cadicaVideoReport.patient) {
    throw new BadRequestException('CADICA video report has no patient linked');
  }

  const assignment = await this.assignmentRepository.findOne({
    where: {
      doctor: { doctorid: doctorId },
      patient: { patientid: cadicaVideoReport.patient.patientid },
    },
    relations: ['doctor', 'patient'],
  });

  if (!assignment) {
    throw new ForbiddenException(
      'You are not assigned to this patient, so you cannot view this prediction',
    );
  }

  if (!cadicaVideoReport.cadicaResult) {
    return {
      message: 'CADICA prediction has not been generated yet',
      cadicaVideoReportId: cadicaVideoReport.cadicavideoreportid,
      status: cadicaVideoReport.status,
      patient: cadicaVideoReport.patient,
      radiologist: {
        radiologistid: cadicaVideoReport.radiologist?.radiologistid,
        fullname: cadicaVideoReport.radiologist?.fullname,
        email: cadicaVideoReport.radiologist?.email,
        contactnumber: cadicaVideoReport.radiologist?.contactnumber,
        status: cadicaVideoReport.radiologist?.status,
        createdat: cadicaVideoReport.radiologist?.createdat,
      },
      cadicaResult: null,
      modelResult: null,
      summaryImageUrl: null,
      gradcamImages: [],
      perVideo: [],
    };
  }

  let modelResult: any = null;

  try {
    modelResult = cadicaVideoReport.cadicaResult.rawResult
      ? JSON.parse(cadicaVideoReport.cadicaResult.rawResult)
      : null;
  } catch {
    modelResult = cadicaVideoReport.cadicaResult.rawResult;
  }

  const cadicaResult: any = cadicaVideoReport.cadicaResult;

  const summaryImageUrl =
    cadicaResult.summaryImageUrl ??
    modelResult?.summary_image_url ??
    null;

  const summaryImage =
    cadicaResult.summaryImage ??
    modelResult?.summary_image ??
    null;

  const perVideo =
    cadicaResult.perVideo ??
    modelResult?.per_video ??
    [];

  const gradcamImages =
    cadicaResult.gradcamImages ??
    perVideo.map((item) => ({
      video: item?.video ?? null,
      prediction: item?.prediction ?? null,
      probability: item?.probability ?? null,
      weight: item?.weight ?? null,
      gtLabel: item?.gt_label ?? null,
      correct: item?.correct ?? null,
      gradcamImg: item?.gradcam_img ?? null,
      gradcamImgUrl: item?.gradcam_img_url ?? null,
    }));

  return {
    message: 'CADICA prediction fetched successfully',
    cadicaVideoReportId: cadicaVideoReport.cadicavideoreportid,
    status: cadicaVideoReport.status,

    patient: cadicaVideoReport.patient,

    radiologist: {
      radiologistid: cadicaVideoReport.radiologist?.radiologistid,
      fullname: cadicaVideoReport.radiologist?.fullname,
      email: cadicaVideoReport.radiologist?.email,
      contactnumber: cadicaVideoReport.radiologist?.contactnumber,
      status: cadicaVideoReport.radiologist?.status,
      createdat: cadicaVideoReport.radiologist?.createdat,
    },

    cadicaResult: {
      cadicaresultid: cadicaResult.cadicaresultid,
      cadicavideoreportid: cadicaResult.cadicavideoreportid,

      verdict: cadicaResult.verdict,
      confidence: cadicaResult.confidence,
      weightedAvgProb: cadicaResult.weightedAvgProb,

      mostSuspiciousVideo: cadicaResult.mostSuspiciousVideo,
      mostSuspiciousProb: cadicaResult.mostSuspiciousProb,

      videosProcessed: cadicaResult.videosProcessed,
      videosSkipped: cadicaResult.videosSkipped,

      summaryImage,
      summaryImageUrl,
      gradcamImages,
      perVideo,

      modelname: cadicaResult.modelname,
      processedat: cadicaResult.processedat,
    },

    modelResult,

    reportAssets: {
      summaryImage,
      summaryImageUrl,
      gradcamImages,
    },
  };
}


//get all cadica video reports 

async getAllCadicaVideoReports() {
  const cadicaVideoReports = await this.cadicaVideoReportRepository.find({
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
    message: 'CADICA video reports fetched successfully',
    total: cadicaVideoReports.length,
    cadicaVideoReports: cadicaVideoReports.map((report) => {
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
        cadicavideoreportid: report.cadicavideoreportid,
        videos: report.videos,
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


async getCadicaVideoReportsByPatientId(patientId: number) {
  if (!patientId || Number.isNaN(Number(patientId))) {
    throw new BadRequestException('Valid patientId is required');
  }

  const cadicaVideoReports = await this.cadicaVideoReportRepository.find({
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

  if (!cadicaVideoReports.length) {
    throw new NotFoundException(
      `No CADICA video reports found for patient with ID ${patientId}`,
    );
  }

  return {
    message: 'CADICA video reports fetched successfully',
    patientId,
    total: cadicaVideoReports.length,
    cadicaVideoReports: cadicaVideoReports.map((report) => {
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
        cadicavideoreportid: report.cadicavideoreportid,
        videos: report.videos,
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