import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import axios from 'axios';
import FormData from 'form-data';
import { Repository } from 'typeorm';

import { Assignment }   from 'src/entities/entities/Assignment';
import { Doctor }       from 'src/entities/entities/Doctor';
import { Patient }      from 'src/entities/entities/Patient';
import { Radiologist }  from 'src/entities/entities/Radiologist';
import { StrokeReport } from 'src/entities/entities/StrokeReport';
import { StrokeResult } from 'src/entities/entities/StrokeResult';
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

  // ─────────────────────────────────────────────────────────────────────────
  // UPLOAD + PREDICT
  // ─────────────────────────────────────────────────────────────────────────
  async uploadStrokeImageAndPredict(
    radiologistId: number,
    patientId: number,
    cloudinaryUrl: string,   // input CT image already on Cloudinary
    comment?: string,
  ) {
    // ── 1. Validate ──────────────────────────────────────────────────────────
    if (!cloudinaryUrl) {
      throw new BadRequestException('Cloudinary URL is required');
    }

    if (!patientId || Number.isNaN(patientId)) {
      throw new BadRequestException('Valid patientId is required');
    }

    const radiologist = await this.radiologistRepository.findOne({
      where: { radiologistid: radiologistId },
    });
    if (!radiologist) throw new NotFoundException('Radiologist not found');

    const patient = await this.patientRepository.findOne({
      where: { patientid: patientId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    // ── 2. Save StrokeReport (PENDING) ───────────────────────────────────────
    const filename = cloudinaryUrl.split('/').pop() ?? 'ct_image.jpg';

    const strokeReport = this.strokeReportRepository.create({
      filename,
      filepath: cloudinaryUrl,  // ✅ Cloudinary input URL stored here
      mimetype: null,
      size:     null,
      comment:  comment?.trim() || null,
      status:   'PENDING',
      patient,
      radiologist,
    });

    const savedStrokeReport = await this.strokeReportRepository.save(strokeReport);

    // ── 3. Download CT image from Cloudinary → send to Python API ────────────
    let strokeModelResult: any        = null;
    let savedStrokeResult: StrokeResult | null = null;

    try {
      const pythonApiUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';

      // Download buffer from Cloudinary
      const imageResponse = await axios.get<ArrayBuffer>(cloudinaryUrl, {
        responseType: 'arraybuffer',
      });
      const imageBuffer = Buffer.from(imageResponse.data);

      // Multipart form for Python API
      const formData = new FormData();
      formData.append('file', imageBuffer, {
        filename,
        contentType: 'image/jpeg',
      });

      // Call Python prediction
      const response = await axios.post(
        `${pythonApiUrl}/stroke/predict?report_id=${savedStrokeReport.strokereportid}`,
        formData,
        {
          headers:          formData.getHeaders(),
          maxBodyLength:    Infinity,
          maxContentLength: Infinity,
        },
      );

      strokeModelResult = response.data;

      // ── 4. Save StrokeResult with Cloudinary output URLs ──────────────────
      // Python API uploads result/overlay to Cloudinary and returns their URLs
      savedStrokeResult = await this.strokeResultRepository.save(
        this.strokeResultRepository.create({
          strokereportid: savedStrokeReport.strokereportid,

          prediction:            strokeModelResult?.prediction             ?? null,
          predictionClass:       strokeModelResult?.prediction_class       ?? null,
          confidence:            strokeModelResult?.confidence             ?? null,
          probabilities:         strokeModelResult?.probabilities          ?? null,
          segmentationGenerated: strokeModelResult?.segmentation_generated ?? null,

          // Local paths — will be null now since Python uses temp dirs
          resultImage:  strokeModelResult?.result_image  ?? null,
          overlayImage: strokeModelResult?.overlay_image ?? null,

          // ✅ Cloudinary URLs — set by Python API
          resultImageUrl:  strokeModelResult?.result_image_url  ?? null,
          overlayImageUrl: strokeModelResult?.overlay_image_url ?? null,

          pythonReportId: strokeModelResult?.report_id ?? null,
          device:         strokeModelResult?.device    ?? null,
          rawResult:      JSON.stringify(strokeModelResult),
          modelname:      'STROKE_FINAL_MODEL_V2',
        }),
      );

      savedStrokeReport.status = 'PREDICTED';
      await this.strokeReportRepository.save(savedStrokeReport);

    } catch (error) {
      console.error(
        '[StrokeService] Prediction failed:',
        error?.response?.data || error?.message || error,
      );

      savedStrokeReport.status = 'PREDICTION_FAILED';
      await this.strokeReportRepository.save(savedStrokeReport);

      throw new InternalServerErrorException({
        message:        'Stroke image uploaded but prediction failed',
        strokeReportId: savedStrokeReport.strokereportid,
        error:          error?.response?.data || error?.message || 'Unknown error',
      });
    }

    // ── 5. Notify assigned doctor via FCM ────────────────────────────────────
    const assignments = await this.assignmentRepository.find({
      where:     { patient: { patientid: patientId } },
      relations: ['doctor'],
      order:     { assignmentid: 'DESC' },
    });

    const doctor = assignments[0]?.doctor;

    let notification: Record<string, any> = {
      sent:   false,
      reason: 'No doctor assigned to this patient',
    };

    if (doctor?.fcmtoken?.trim()) {
      try {
        await this.firebaseService.sendReportToDoctor({
          fcmToken:        doctor.fcmtoken,
          doctorName:      doctor.fullname,
          patientName:     patient.fullname,
          reportId:        savedStrokeReport.strokereportid,
          radiologistName: radiologist.fullname,
          comment:
            comment?.trim() ||
            `Stroke CT image prediction is ready for patient ${patient.fullname}.`,
        });

        notification = {
          sent:         true,
          sentToDoctor: doctor.fullname,
          doctorId:     doctor.doctorid,
        };
      } catch (error) {
        notification = {
          sent:                 false,
          reason:               'Firebase notification failed',
          firebaseErrorCode:    error?.errorInfo?.code ?? 'UNKNOWN',
          firebaseErrorMessage: error?.message         ?? 'Unknown Firebase error',
        };
      }
    } else if (doctor) {
      notification = {
        sent:   false,
        reason: `Doctor "${doctor.fullname}" has no FCM token registered.`,
      };
    }

    // ── 6. Response ───────────────────────────────────────────────────────────
    return {
      message:      'Stroke image uploaded, predicted, and sent to assigned doctor successfully',
      patientId,
      strokeReport: savedStrokeReport,
      strokeResult: savedStrokeResult,
      modelResult:  strokeModelResult,
      notification,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET FOR DOCTOR
  // ─────────────────────────────────────────────────────────────────────────
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
      where:     { strokereportid: strokeReportId },
      relations: ['patient', 'radiologist', 'strokeResult'],
    });

    if (!strokeReport) throw new NotFoundException('Stroke report not found');

    if (!strokeReport.patient) {
      throw new BadRequestException('Stroke report has no patient linked');
    }

    const assignment = await this.assignmentRepository.findOne({
      where: {
        doctor:  { doctorid: doctorId },
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
        message:        'Stroke prediction has not been generated yet',
        strokeReportId: strokeReport.strokereportid,
        status:         strokeReport.status,
        patient:        strokeReport.patient,
        radiologist:    strokeReport.radiologist
          ? {
              radiologistid: strokeReport.radiologist.radiologistid,
              fullname:      strokeReport.radiologist.fullname,
              email:         strokeReport.radiologist.email,
              contactnumber: strokeReport.radiologist.contactnumber,
              status:        strokeReport.radiologist.status,
              createdat:     strokeReport.radiologist.createdat,
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
      message:        'Stroke prediction fetched successfully',
      strokeReportId: strokeReport.strokereportid,
      status:         strokeReport.status,

      patient: strokeReport.patient
        ? {
            patientid:     strokeReport.patient.patientid,
            fullname:      strokeReport.patient.fullname,
            email:         strokeReport.patient.email,
            age:           strokeReport.patient.age,
            gender:        strokeReport.patient.gender,
            contactnumber: strokeReport.patient.contactnumber,
            address:       strokeReport.patient.address,
            createdat:     strokeReport.patient.createdat,
          }
        : null,

      radiologist: strokeReport.radiologist
        ? {
            radiologistid: strokeReport.radiologist.radiologistid,
            fullname:      strokeReport.radiologist.fullname,
            email:         strokeReport.radiologist.email,
            contactnumber: strokeReport.radiologist.contactnumber,
            status:        strokeReport.radiologist.status,
            createdat:     strokeReport.radiologist.createdat,
          }
        : null,

      strokeResult: {
        strokeresultid:        strokeReport.strokeResult.strokeresultid,
        strokereportid:        strokeReport.strokeResult.strokereportid,
        prediction:            strokeReport.strokeResult.prediction,
        predictionClass:       strokeReport.strokeResult.predictionClass,
        confidence:            strokeReport.strokeResult.confidence,
        probabilities:         strokeReport.strokeResult.probabilities,
        segmentationGenerated: strokeReport.strokeResult.segmentationGenerated,
        // ✅ Only Cloudinary URLs returned — no local paths
        resultImageUrl:        strokeReport.strokeResult.resultImageUrl,
        overlayImageUrl:       strokeReport.strokeResult.overlayImageUrl,
        pythonReportId:        strokeReport.strokeResult.pythonReportId,
        device:                strokeReport.strokeResult.device,
        modelname:             strokeReport.strokeResult.modelname,
        processedat:           strokeReport.strokeResult.processedat,
      },

      modelResult,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET ALL STROKE REPORTS (Admin)
  // ─────────────────────────────────────────────────────────────────────────
  async getAllStrokeReports() {
    const strokeReports = await this.strokeReportRepository.find({
      relations: [
        'patient',
        'patient.assignments',
        'patient.assignments.doctor',
        'radiologist',
      ],
      order: { uploadedat: 'ASC' },
    });

    return {
      message:      'Stroke reports fetched successfully',
      total:        strokeReports.length,
      strokeReports: strokeReports.map((report) => this.formatReportWithDoctor(report)),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET STROKE REPORTS BY PATIENT ID
  // ─────────────────────────────────────────────────────────────────────────
   // Get stroke reports by patient ID
  async getStrokeReportsByPatientId(patientId: number) {
    if (!patientId || Number.isNaN(Number(patientId))) {
      throw new BadRequestException('Valid patientId is required');
    }

    const strokeReports = await this.strokeReportRepository.find({
      where: {
        patient: { patientid: patientId },  // Filter by patient ID
      },
      relations: [
        'patient',
        'patient.assignments',
        'patient.assignments.doctor',
        'radiologist',
        'strokeResult',  // Include StrokeResult relation here
      ],
      order: {
        uploadedat: 'DESC',  // Order by uploaded date to get the most recent reports first
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
      strokeReports: strokeReports.map((report) => this.formatReportWithDoctor(report)),  // Calling the helper function
    };
  }

  // Private helper function to format the report with doctor info
  private formatReportWithDoctor(report: StrokeReport) {
    const assignments = report.patient?.assignments || [];

    const latestAssignment = assignments
      .filter((a) => a.doctor)
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
      filepath: report.filepath,   // Cloudinary URL for the file
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

      // Include StrokeResult details for the stroke report
      strokeResult: report.strokeResult
        ? {
            strokeresultid: report.strokeResult.strokeresultid,
            prediction: report.strokeResult.prediction,
            predictionClass: report.strokeResult.predictionClass,
            confidence: report.strokeResult.confidence,
            probabilities: report.strokeResult.probabilities,
            segmentationGenerated: report.strokeResult.segmentationGenerated,
            resultImage: report.strokeResult.resultImage,
            overlayImage: report.strokeResult.overlayImage,
            resultImageUrl: report.strokeResult.resultImageUrl,
            overlayImageUrl: report.strokeResult.overlayImageUrl,
            pythonReportId: report.strokeResult.pythonReportId,
            device: report.strokeResult.device,
            rawResult: report.strokeResult.rawResult,
            modelname: report.strokeResult.modelname,
            processedat: report.strokeResult.processedat,
          }
        : null,
    };
  }
}