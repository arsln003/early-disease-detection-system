import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiResult } from 'src/entities/entities/AiResult';
import { Feature } from 'src/entities/entities/Feature';
import { Report } from 'src/entities/entities/Report';

@Injectable()
export class PredictionService {
  constructor(
    private readonly httpService: HttpService,

    @InjectRepository(AiResult)
    private readonly aiResultRepository: Repository<AiResult>,

    @InjectRepository(Feature)
    private readonly featureRepository: Repository<Feature>,

    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

//   async predictFromFeature(reportId: number) {
//     const report = await this.reportRepository.findOne({
//       where: { reportid: reportId },
//       relations: ['feature'],
//     });

//     if (!report) {
//       throw new InternalServerErrorException('Report not found');
//     }

//     if (!report.feature) {
//       throw new InternalServerErrorException('Feature data not found for this report');
//     }

//     const feature = report.feature;

//     const payload = {
//       age: feature.age,
//       gender: feature.gender,
//       height: feature.height,
//       weight: feature.weight,
//       ap_hi: feature.ap_hi,
//       ap_lo: feature.ap_lo,
//       cholesterol: feature.cholesterol,
//       gluc: feature.gluc,
//       smoke: feature.smoke,
//       alco: feature.alco,
//       active: feature.active,
//     };

//     try {
//       const response = await firstValueFrom(
//         this.httpService.post('http://localhost:8000/predict', payload),
//       );

//       const result = response.data;

//       let aiResult = await this.aiResultRepository.findOne({
//         where: { reportid: reportId },
//       });

//       if (!aiResult) {
//         aiResult = this.aiResultRepository.create({
//           reportid: reportId,
//         });
//       }

//       aiResult.prediction = result.prediction;
//       aiResult.probability = result.probability;
//       aiResult.classification =
//         result.prediction === 1 ? 'High Risk' : 'Low Risk';
//       aiResult.modelname = 'CardioModelV1';
//       aiResult.keyparameters = `BP: ${feature.ap_hi}/${feature.ap_lo}, Cholesterol: ${feature.cholesterol}, Glucose: ${feature.gluc}`;
//       aiResult.remarks =
//         result.prediction === 1
//           ? 'Predicted high cardiovascular risk'
//           : 'Predicted low cardiovascular risk';

//       await this.aiResultRepository.save(aiResult);

//       return {
//         message: 'Prediction generated successfully',
//         aiResult,
//       };
//     } catch (error) {
//     //   console.error('Prediction error:', error?.response?.data || error.message);
//     //   throw new InternalServerErrorException('Prediction API failed');
   
//   console.error('Prediction error full:', error);
//   console.error('Prediction error response:', error?.response?.data);
//   console.error('Prediction error message:', error?.message);
//   console.error('Prediction error stack:', error?.stack);

//   throw new InternalServerErrorException('Prediction API failed');

//     }
//   }



async predictFromFeature(reportId: number) {
  try {
    if (!reportId || isNaN(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const report = await this.reportRepository.findOne({
      where: { reportid: reportId },
      relations: ['feature'],
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${reportId} not found`);
    }

    if (!report.feature) {
      throw new NotFoundException(
        `Feature data not found for report ID ${reportId}`,
      );
    }

    const feature = report.feature;

    const payload = {
      age: feature.age,
      gender: feature.gender,
      height: feature.height,
      weight: feature.weight,
      ap_hi: feature.ap_hi,
      ap_lo: feature.ap_lo,
      cholesterol: feature.cholesterol,
      gluc: feature.gluc,
      smoke: feature.smoke,
      alco: feature.alco,
      active: feature.active,
    };

    const requiredFields = [
      'age',
      'gender',
      'height',
      'weight',
      'ap_hi',
      'ap_lo',
      'cholesterol',
      'gluc',
      'smoke',
      'alco',
      'active',
    ];

    const missingFields = requiredFields.filter(
      (field) => payload[field] === null || payload[field] === undefined,
    );

    if (missingFields.length > 0) {
      throw new BadRequestException(
        `Missing required feature values: ${missingFields.join(', ')}`,
      );
    }

    let response;
    try {
      response = await firstValueFrom(
        this.httpService.post('http://localhost:8000/predict', payload),
      );
    } catch (error) {
      console.error('Python API error:', error?.response?.data || error.message);

      throw new InternalServerErrorException('Failed to get response from prediction API');
    }

    const result = response.data;

    if (
      result?.prediction === undefined ||
      result?.prediction === null ||
      result?.probability === undefined ||
      result?.probability === null
    ) {
      throw new InternalServerErrorException(
        'Prediction API returned an invalid response',
      );
    }

    let aiResult = await this.aiResultRepository.findOne({
      where: { reportid: reportId },
    });

    if (!aiResult) {
      aiResult = this.aiResultRepository.create({
        reportid: reportId,
      });
    }

    aiResult.prediction = result.prediction;
    aiResult.probability = result.probability;
    aiResult.classification =
      result.prediction === 1 ? 'High Risk' : 'Low Risk';
    aiResult.modelname = 'CardioModelV1';
    aiResult.keyparameters = `BP: ${feature.ap_hi}/${feature.ap_lo}, Cholesterol: ${feature.cholesterol}, Glucose: ${feature.gluc}`;
    aiResult.remarks =
      result.prediction === 1
        ? 'Predicted high cardiovascular risk'
        : 'Predicted low cardiovascular risk';

    let savedResult;
    try {
      savedResult = await this.aiResultRepository.save(aiResult);
    } catch (error) {
      console.error('Database save error:', error);
      throw new InternalServerErrorException('Failed to save AI prediction result');
    }

    return {
      message: 'Prediction generated successfully',
      aiResult: savedResult,
    };
  } catch (error) {
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      throw error;
    }

    console.error('Unexpected prediction error:', error);
    throw new InternalServerErrorException('Prediction process failed');
  }}




// get Prediction result by report id
async getPredictionByReportId(reportId: number) {
  try {
    // validate input
    if (!reportId || isNaN(reportId)) {
      throw new BadRequestException('Invalid report ID');
    }

    const result = await this.aiResultRepository.findOne({
      where: { reportid: reportId },
      relations: ['report', 'report.patient'],
    });

    if (!result) {
      throw new NotFoundException(
        `AI prediction not found for report ID ${reportId}`,
      );
    }

    if (!result.report) {
      throw new NotFoundException('Report data not found');
    }

    if (!result.report.patient) {
      throw new NotFoundException('Patient data not found');
    }

    return {
      prediction: result.prediction,
      probability: result.probability,
      classification: result.classification,
      model: result.modelname,
      processedAt: result.processedat,

      patient: {
        patientid: result.report.patient.patientid,
        fullname: result.report.patient.fullname,
        email: result.report.patient.email,
      },

      report: {
        reportid: result.report.reportid,
        filename: result.report.filename,
        uploadedat: result.report.uploadedat,
      },
    };
  } catch (error) {
    // allow known HTTP errors to pass through
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException
    ) {
      throw error;
    }

    console.error('Error fetching AI prediction:', error);

    throw new InternalServerErrorException(
      'Failed to fetch AI prediction result',
    );
  }
}

}