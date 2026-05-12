import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from 'src/entities/entities/Doctor';
import { UpdateDoctorDto } from 'src/admin/dto/update-doctor.dto'; // <- import DTO
import { CreateDoctorDto } from 'src/admin/dto/create-doctor.dto';
import { Assignment } from 'src/entities/entities/Assignment';
import * as bcrypt from 'bcrypt';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
@InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

  ) {}

  //get-all
  findAllDoctor(): Promise<Doctor[]> {
    return this.doctorRepository.find();
  }

//create
  async createDoctor(doctorData: CreateDoctorDto): Promise<Doctor> {
    // 1️⃣ Check required fields
    if (!doctorData.fullname || !doctorData.email || !doctorData.password) {
      throw new BadRequestException('fullname, email, and password are required');
    }

    // 2️⃣ Check for duplicate email
    const existingDoctor = await this.doctorRepository.findOneBy({ email: doctorData.email });
    if (existingDoctor) {
      throw new ConflictException('Doctor with this email already exists');
    }

  // 3️⃣ Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(doctorData.password, salt);



    // 4️⃣ Create and save doctor
    const doctor = this.doctorRepository.create({
      fullname: doctorData.fullname,
      email: doctorData.email,
      password: hashedPassword,
      specialization: doctorData.specialization || null,
      experience: doctorData.experience || null,
      contactnumber: doctorData.contactnumber || null,
      status: doctorData.status || 'Active',
    });

    return this.doctorRepository.save(doctor);
  }

//delete
  async deleteDoctor(id: number): Promise<void> {
    const result = await this.doctorRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Doctor with id ${id} not found`);
    }
  }


  //update doctor
async updateDoctor(id: number, data: UpdateDoctorDto): Promise<Doctor> {
  const doctor = await this.doctorRepository.findOneBy({ doctorid: id });
  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${id} not found`);
  }

  const allowedData: Partial<Doctor> = {
    fullname: data.fullname,
    specialization: data.specialization,
    email: data.email,
    status: data.status,
  };

  // ✅ hash password if provided
  if (data.password && data.password.trim().length > 0) {
    const salt = await bcrypt.genSalt(10);
    allowedData.password = await bcrypt.hash(data.password, salt);
  }

  await this.doctorRepository.update({ doctorid: id }, allowedData);
  return this.doctorRepository.findOneByOrFail({ doctorid: id });
}


//Assign patient details to doctor
async getAssignedPatients(doctorId: number): Promise<any> {
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid: doctorId },
  });
  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${doctorId} not found`);
  }

  const assignments = await this.assignmentRepository.find({
    where: { doctor: { doctorid: doctorId } },
    relations: ['patient', 'patient.reports', 'patient.reports.aiResult'],
    order: { assignedat: 'DESC' },
  });

  if (!assignments.length) {
    return {
      message: 'No patients assigned to this doctor',
      total: 0,
      patients: [],
    };
  }

  return {
    message: 'Assigned patients fetched successfully',
    total: assignments.length,
    patients: assignments.map((a) => ({
      assignmentid: a.assignmentid,
      assignedat: a.assignedat,
      patient: {
        patientid: a.patient.patientid,
        fullname: a.patient.fullname,
        email: a.patient.email,
        age: a.patient.age,
        gender: a.patient.gender,
        contactnumber: a.patient.contactnumber,
        address: a.patient.address,
        reports: a.patient.reports?.map((r) => ({
          reportid: r.reportid,
          filename: r.filename,
          comment: r.comment,
          uploadedat: r.uploadedat,
          aiResult: r.aiResult
            ? {
                prediction: r.aiResult.prediction,
                probability: r.aiResult.probability,
                classification: r.aiResult.classification,
                remarks: r.aiResult.remarks,
              }
            : null,
        })),
      },
    })),
  };
}





// // get assigned patient info
// // doctor → assignments → patient → reports → aiResult
// // doctor → assignments → patient → cadicaVideoReports → cadicaResult
// // doctor → assignments → patient → strokeReports → strokeResult
async getAssignedPatientsWithDetails(
  doctorId: number,
  severity: 'all' | 'critical' | 'moderate' | 'normal' = 'all',
): Promise<any[]> {
  // 1) Ensure doctor exists
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${doctorId} not found`);
  }

  // 2) Fetch assignments with nested relations
  const assignments = await this.assignmentRepository.find({
    where: { doctor: { doctorid: doctorId } },
    relations: [
      'patient',
      'patient.reports',
      'patient.reports.aiResult',
      'patient.cadicaVideoReports',
      'patient.cadicaVideoReports.cadicaResult',
      'patient.strokeReports',
      'patient.strokeReports.strokeResult',
    ],
    order: { assignedat: 'DESC' },
  });

  // helper to pick category by risk %
  const classifyRisk = (risk: number): 'Normal' | 'Moderate' | 'Critical' => {
    if (risk < 50) return 'Normal';
    if (risk <= 75) return 'Moderate';
    return 'Critical';
  };

  const enhancedAssignments = assignments
    .map((assignment) => {
      let patientRiskCategory: string | null = null;

      // Handling reports and AI results
      assignment.patient.reports = assignment.patient.reports.map((report) => {
        const ai = report.aiResult;

        if (ai && ai.probability != null) {
          const risk = Number(ai.probability) * 100; // convert to percentage
          const riskCategory = classifyRisk(risk);

          // decide patient-level category (take highest severity)
          const rank: Record<string, number> = {
            Normal: 1,
            Moderate: 2,
            Critical: 3,
          };

          if (
            !patientRiskCategory ||
            rank[riskCategory] > (rank[patientRiskCategory] || 0)
          ) {
            patientRiskCategory = riskCategory;
          }

          return {
            ...report,
            aiResult: {
              ...ai,
              riskCategory,
            },
          };
        }

        return {
          ...report,
          aiResult: {
            ...ai,
            riskCategory: 'No AI Result',
          },
        };
      });

      // Handling Cadica Video Reports and Results
      assignment.patient.cadicaVideoReports = assignment.patient.cadicaVideoReports.map((cadicaVideoReport) => {
        const cadicaResult = cadicaVideoReport.cadicaResult;
        return {
          ...cadicaVideoReport,
          cadicaResult: cadicaResult || null,
        };
      });

      // Handling Stroke Reports and Results
      assignment.patient.strokeReports = assignment.patient.strokeReports.map((strokeReport) => {
        const strokeResult = strokeReport.strokeResult;
        return {
          ...strokeReport,
          strokeResult: strokeResult || null,
        };
      });

      const { doctor, ...cleanedAssignment } = assignment as any;

      return {
        ...cleanedAssignment,
        patientRiskCategory: patientRiskCategory || 'No AI Result',
      };
    })
    // 3) Apply severity filter
    .filter((item) => {
      if (severity === 'all') return true;

      const cat = (item.patientRiskCategory || '').toLowerCase();
      return cat === severity.toLowerCase();
    });

  return enhancedAssignments;
}

async getCardioAssignedPatientsWithDetails(
  doctorId: number,
  severity: 'all' | 'low' | 'high' = 'all',
): Promise<any[]> {
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${doctorId} not found`);
  }

  const assignments = await this.assignmentRepository.find({
    where: { doctor: { doctorid: doctorId } },
    relations: [
      'patient',
      'patient.reports',
      'patient.reports.aiResult',
    ],
    order: { assignedat: 'DESC' },
  });

  const classifyRisk = (probability: number): 'Low Risk' | 'High Risk' => {
    const risk = Number(probability) * 100;
    return risk < 50 ? 'Low Risk' : 'High Risk';
  };

  const enhancedAssignments = assignments
    .map((assignment) => {
      let hasHighRisk = false;
      let hasLowRisk = false;

      let cardioReports = assignment.patient.reports
        .filter(
          (report) =>
            report.aiResult &&
            report.aiResult.probability !== null &&
            report.aiResult.probability !== undefined,
        )
        .map((report) => {
          const ai = report.aiResult;

          const riskCategory = classifyRisk(Number(ai.probability));

          if (riskCategory === 'High Risk') {
            hasHighRisk = true;
          }

          if (riskCategory === 'Low Risk') {
            hasLowRisk = true;
          }

          return {
            ...report,
            aiResult: {
              ...ai,
              riskCategory,
            },
          };
        })
        .sort((a, b) => {
          return (
            new Date(b.uploadedat ?? 0).getTime() -
            new Date(a.uploadedat ?? 0).getTime()
          );
        });

      if (severity === 'low') {
        cardioReports = cardioReports.filter(
          (report) => report.aiResult.riskCategory === 'Low Risk',
        );
      }

      if (severity === 'high') {
        cardioReports = cardioReports.filter(
          (report) => report.aiResult.riskCategory === 'High Risk',
        );
      }

      let patientRiskCategory = 'No AI Result';

      if (hasHighRisk) {
        patientRiskCategory = 'High Risk';
      } else if (hasLowRisk) {
        patientRiskCategory = 'Low Risk';
      }

      return {
        assignmentid: assignment.assignmentid,
        assignedat: assignment.assignedat,
        patientRiskCategory,
        patient: {
          patientid: assignment.patient.patientid,
          fullname: assignment.patient.fullname,
          email: assignment.patient.email,
          age: assignment.patient.age,
          gender: assignment.patient.gender,
          contactnumber: assignment.patient.contactnumber,
          address: assignment.patient.address,
          createdat: assignment.patient.createdat,
          reports: cardioReports,
        },
      };
    })
    .filter((item) => {
      return item.patient.reports.length > 0;
    });

  return enhancedAssignments;
}




async getStrokeAssignedPatientsWithDetails(
  doctorId: number,
  severity: 'all' | 'no-stroke' | 'ischemia' | 'hemorrhage' = 'all',
): Promise<any[]> {
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${doctorId} not found`);
  }

  const assignments = await this.assignmentRepository.find({
    where: { doctor: { doctorid: doctorId } },
    relations: [
      'patient',
      'patient.strokeReports',
      'patient.strokeReports.strokeResult',
    ],
    order: { assignedat: 'DESC' },
  });

  const normalizeSeverity = (
    value: 'all' | 'no-stroke' | 'ischemia' | 'hemorrhage',
  ): 'all' | 'No Stroke' | 'Ischemia' | 'Hemorrhage' => {
    if (value === 'no-stroke') return 'No Stroke';
    if (value === 'ischemia') return 'Ischemia';
    if (value === 'hemorrhage') return 'Hemorrhage';
    return 'all';
  };

  const selectedSeverity = normalizeSeverity(severity);

  const enhancedAssignments = assignments
    .map((assignment) => {
      let strokeReports = assignment.patient.strokeReports
        .filter(
          (strokeReport) =>
            strokeReport.strokeResult &&
            strokeReport.strokeResult.prediction,
        )
        .map((strokeReport) => {
          const strokeResult = strokeReport.strokeResult;

          return {
            ...strokeReport,
            strokeResult: {
              ...strokeResult,
              severityCategory: strokeResult.prediction,
            },
          };
        })
        .sort((a, b) => {
          return (
            new Date(b.uploadedat ?? 0).getTime() -
            new Date(a.uploadedat ?? 0).getTime()
          );
        });

      if (selectedSeverity !== 'all') {
        strokeReports = strokeReports.filter(
          (strokeReport) =>
            strokeReport.strokeResult.severityCategory === selectedSeverity,
        );
      }

      return {
        assignmentid: assignment.assignmentid,
        assignedat: assignment.assignedat,
        patient: {
          patientid: assignment.patient.patientid,
          fullname: assignment.patient.fullname,
          email: assignment.patient.email,
          age: assignment.patient.age,
          gender: assignment.patient.gender,
          contactnumber: assignment.patient.contactnumber,
          address: assignment.patient.address,
          createdat: assignment.patient.createdat,
          strokeReports,
        },
      };
    })
    .filter((item) => {
      return item.patient.strokeReports.length > 0;
    });

  return enhancedAssignments;
}



async getCadicaAssignedPatientsWithDetails(
  doctorId: number,
): Promise<any[]> {
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid: doctorId },
  });

  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${doctorId} not found`);
  }

  const assignments = await this.assignmentRepository.find({
    where: { doctor: { doctorid: doctorId } },
    relations: [
      'patient',
      'patient.cadicaVideoReports',
      'patient.cadicaVideoReports.cadicaResult',
    ],
    order: { assignedat: 'DESC' },
  });

  const enhancedAssignments = assignments
    .map((assignment) => {
      const cadicaVideoReports = assignment.patient.cadicaVideoReports
        .filter((report) => report.cadicaResult)
        .map((report) => {
          const result = report.cadicaResult;

          return {
            ...report,

            cadicaResult: result,

            modelResult: {
              verdict: result.verdict,
              confidence: result.confidence,
              weighted_avg_prob: result.weightedAvgProb,
              most_suspicious_video: result.mostSuspiciousVideo,
              most_suspicious_prob: result.mostSuspiciousProb,
              videos_processed: result.videosProcessed,
              videos_skipped: result.videosSkipped,
              summary_image: result.summaryImage,
              summary_image_url: result.summaryImageUrl,
              per_video: result.perVideo,
              report_id: report.cadicavideoreportid,
            },

            reportAssets: {
              summaryImage: result.summaryImage,
              summaryImageUrl: result.summaryImageUrl,
              gradcamImages: result.gradcamImages,
            },
          };
        })
        .sort((a, b) => {
          return (
            new Date(b.uploadedat ?? 0).getTime() -
            new Date(a.uploadedat ?? 0).getTime()
          );
        });

      return {
        assignmentid: assignment.assignmentid,
        assignedat: assignment.assignedat,
        patient: {
          patientid: assignment.patient.patientid,
          fullname: assignment.patient.fullname,
          email: assignment.patient.email,
          age: assignment.patient.age,
          gender: assignment.patient.gender,
          contactnumber: assignment.patient.contactnumber,
          address: assignment.patient.address,
          createdat: assignment.patient.createdat,
          cadicaVideoReports,
        },
      };
    })
    .filter((item) => item.patient.cadicaVideoReports.length > 0);

  return enhancedAssignments;
}




//save fcm token for doctor
  async saveFcmToken(doctorId: number, fcmtoken: string): Promise<{ message: string }> {
    if (!fcmtoken?.trim()) {
      throw new BadRequestException('fcmtoken is required');
    }

    const doctor = await this.doctorRepository.findOne({
      where: { doctorid: doctorId },
    });

    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    doctor.fcmtoken = fcmtoken.trim();
    await this.doctorRepository.save(doctor);

    return { message: 'FCM token saved successfully' };
  }


async getDoctorProfile(doctorid: number) {
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  const { password, fcmtoken, ...safeDoctor } = doctor;

  return safeDoctor;
}


//assign patient count for doctor
async getAssignedPatientsCount(doctorid: number) {
  const doctor = await this.doctorRepository.findOne({
    where: { doctorid },
  });

  if (!doctor) {
    throw new NotFoundException('Doctor not found');
  }

  const count = await this.assignmentRepository.count({
    where: {
      doctor: {
        doctorid,
      },
    },
  });

  return {
    doctorid,
    doctorName: doctor.fullname,
    assignedPatientsCount: count,
  };
}
}