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

  async processMultipleVideoBuffers(files: CadicaVideoFile[]) {
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
        'http://localhost:8000/cadica/predict',
        formData,
        {
          headers: formData.getHeaders(),
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        },
      );

      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          'CADICA model inference failed',
      );
    }
  }

  private buildFinalCadicaResult(cadicaModelResult: any) {
    const results = Array.isArray(cadicaModelResult?.results)
      ? cadicaModelResult.results
      : [];

    const resultItems = results
      .map((item) => item?.result)
      .filter(Boolean);

    const lesionItems = resultItems.filter(
      (item) => item?.verdict === 'LESION',
    );

    const verdict =
      cadicaModelResult?.verdict ??
      (lesionItems.length > 0 ? 'LESION' : 'NO LESION');

    const highestConfidenceItem = resultItems.reduce((best, current) => {
      const currentConfidence = Number(current?.confidence ?? 0);
      const bestConfidence = Number(best?.confidence ?? 0);

      return currentConfidence > bestConfidence ? current : best;
    }, resultItems[0] ?? null);

    const mostSuspiciousItem = resultItems.reduce((best, current) => {
      const currentProb = Number(
        current?.most_suspicious_prob ?? current?.weighted_avg_prob ?? 0,
      );
      const bestProb = Number(
        best?.most_suspicious_prob ?? best?.weighted_avg_prob ?? 0,
      );

      return currentProb > bestProb ? current : best;
    }, resultItems[0] ?? null);

    return {
      verdict,

      confidence:
        cadicaModelResult?.confidence ??
        highestConfidenceItem?.confidence ??
        null,

      weightedAvgProb:
        cadicaModelResult?.weighted_avg_prob ??
        mostSuspiciousItem?.weighted_avg_prob ??
        null,

      mostSuspiciousVideo:
        cadicaModelResult?.most_suspicious_video ??
        mostSuspiciousItem?.most_suspicious_video ??
        null,

      mostSuspiciousProb:
        cadicaModelResult?.most_suspicious_prob ??
        mostSuspiciousItem?.most_suspicious_prob ??
        mostSuspiciousItem?.weighted_avg_prob ??
        null,

      videosProcessed:
        cadicaModelResult?.videos_processed ??
        cadicaModelResult?.total_files ??
        resultItems.length ??
        null,

      videosSkipped: cadicaModelResult?.videos_skipped ?? null,
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
      return {
        message: 'CADICA prediction already exists for this video report',
        cadicaVideoReportId: cadicaVideoReport.cadicavideoreportid,
        patient: cadicaVideoReport.patient,
        radiologist: cadicaVideoReport.radiologist,
        cadicaResult: cadicaVideoReport.cadicaResult,
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

    const cadicaModelResult =
      await this.processMultipleVideoBuffers(videoFiles);

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

  return {
    message: 'CADICA prediction fetched successfully',
    cadicaVideoReportId: cadicaVideoReport.cadicavideoreportid,
    patient: cadicaVideoReport.patient,

    // password expose na ho isliye radiologist manually return kar rahe hain
    radiologist: {
      radiologistid: cadicaVideoReport.radiologist?.radiologistid,
      fullname: cadicaVideoReport.radiologist?.fullname,
      email: cadicaVideoReport.radiologist?.email,
      contactnumber: cadicaVideoReport.radiologist?.contactnumber,
      status: cadicaVideoReport.radiologist?.status,
      createdat: cadicaVideoReport.radiologist?.createdat,
    },

    cadicaResult: cadicaVideoReport.cadicaResult,
    modelResult,
  };
}


}