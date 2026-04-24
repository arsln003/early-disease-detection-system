import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { CreateRadiologistDto } from 'src/admin/dto/create-radiologist.dto';
import { UpdateRadiologistDto } from 'src/admin/dto/update-radiologist.dto';
import * as bcrypt from 'bcrypt';
import { OcrService } from 'src/ocr/ocr.service';
import { FirebaseService } from 'src/firebase/firebase.service';
import { Assignment } from 'src/entities/entities/Assignment';
import { Report } from 'src/entities/entities/Report';
import { Doctor } from 'src/entities/entities/Doctor';

@Injectable()
export class RadiologistService {
  constructor(
    @InjectRepository(Radiologist)
    private readonly radiologistRepository: Repository<Radiologist>,
      @InjectRepository(Report)
    private readonly reportRepo: Repository<Report>,

    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,

    private readonly firebaseService: FirebaseService,
 @InjectRepository(Doctor)   // 👈 ADD THIS
  private readonly doctorRepo: Repository<Doctor>, // 👈 ADD THIS

  ) {}

  // ---- GET ALL ----
  findAllRadiologists(): Promise<Radiologist[]> {
    return this.radiologistRepository.find({
      relations: ['reports'],
    });
  }

// create
async createRadiologist(dto: CreateRadiologistDto): Promise<Radiologist> {
  // 1️⃣ Validate required fields
  if (!dto.fullname || !dto.email || !dto.password) {
    throw new BadRequestException("fullname, email, and password are required");
  }

  // 2️⃣ Check duplicate email
  const existing = await this.radiologistRepository.findOne({
    where: { email: dto.email }
  });

  if (existing) {
    throw new ConflictException("Radiologist with this email already exists");
  }

    // 3️⃣ Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(dto.password, salt);

  // 3️⃣ Create the radiologist entity
  const radiologist = this.radiologistRepository.create({
    fullname: dto.fullname,
    email: dto.email,
    password: hashedPassword,
    contactnumber: dto.contactnumber ?? null,
    status: dto.status ?? "Active"
  });

  // 4️⃣ Save to database
  return await this.radiologistRepository.save(radiologist);
}


  
  // ---- DELETE ----
  async deleteRadiologist(id: number): Promise<void> {
    const result = await this.radiologistRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Radiologist with id ${id} not found`);
    }
  }

async updateRadiologist(id: number, dto: UpdateRadiologistDto): Promise<Radiologist> {
  const radiologist = await this.radiologistRepository.findOne({
    where: { radiologistid: id },
  });

  if (!radiologist) {
    throw new NotFoundException(`Radiologist with id ${id} not found`);
  }

  // Check duplicate email
  if (dto.email) {
    const existing = await this.radiologistRepository.findOne({
      where: { email: dto.email },
    });
    if (existing && existing.radiologistid !== id) {
      throw new ConflictException('Another radiologist already uses this email');
    }
  }

  // ✅ hash password if provided
  if (dto.password && dto.password.trim().length > 0) {
    const salt = await bcrypt.genSalt(10);
    dto.password = await bcrypt.hash(dto.password, salt);
  } else {
    delete dto.password; // ✅ don't overwrite existing password with empty string
  }

  Object.assign(radiologist, dto);
  return this.radiologistRepository.save(radiologist);
}

  async getRadiologistsWithReportCount(): Promise<(Radiologist & { reportsCount: number })[]> {
    const radiologists = await this.radiologistRepository
      .createQueryBuilder('r')
      .leftJoin('r.reports', 'report')
      .loadRelationCountAndMap('r.reportsCount', 'r.reports') // 👈 adds r.reportsCount
      .getMany();

    return radiologists as (Radiologist & { reportsCount: number })[];
  }



async getMyProfile(id: number): Promise<Radiologist> {
    const radiologist = await this.radiologistRepository.findOne({
      where: { radiologistid: id },
      relations: ['reports'],
    });

    if (!radiologist) {
      throw new NotFoundException('Radiologist not found');
    }

    return radiologist;
  }



  async finalizeReport(
    radiologistId: number,
    reportId: number,
    body: { findings: string; impression: string; status?: string },
  ) {
    return {
      message: 'Finalize report logic here',
      radiologistId,
      reportId,
      data: body,
    };
  }


//send report to doctor

//  async sendReportToDoctor(
//     reportId: number,
//     radiologistId: number,
//     comment?: string,
//   ) {
//     // 1. Find report with relations
//     const report = await this.reportRepo.findOne({
//       where: { reportid: reportId },
//       relations: ['patient', 'radiologist'],
//     });

//     if (!report) throw new NotFoundException('Report not found');

//     // 2. Find assigned doctor for this patient
//     const assignment = await this.assignmentRepo.findOne({
//       where: { patient: { patientid: report.patient.patientid } },
//       relations: ['doctor'],
//     });

//     if (!assignment?.doctor) {
//       throw new NotFoundException('No doctor assigned to this patient');
//     }

//     const doctor = assignment.doctor;

//     if (!doctor.fcmtoken) {
//       throw new NotFoundException('Doctor has no registered device token');
//     }

//     // 3. Save comment if provided
//     if (comment) {
//       report.comment = comment;
//       await this.reportRepo.save(report);
//     }

//     // 4. Send Firebase notification
//     await this.firebaseService.sendReportToDoctor({
//       fcmToken: doctor.fcmtoken,
//       doctorName: doctor.fullname,
//       patientName: report.patient.fullname,
//       reportId: report.reportid,
//       radiologistName: report.radiologist.fullname,
//       comment: report.comment ?? '',
//     });

//     return {
//       message: `Report sent to Dr. ${doctor.fullname}`,
//       reportId: report.reportid,
//       doctorName: doctor.fullname,
//     };
//   }

async sendReportToDoctor(
  reportId: number,
  radiologistId: number,
  comment?: string,
) {
  // 1. Find report with relations
  const report = await this.reportRepo.findOne({
    where: { reportid: reportId },
    relations: ['patient', 'radiologist'],
  });

  if (!report) {
    throw new NotFoundException('Report not found');
  }

  // 2. Find latest assigned doctor for this patient
  const assignments = await this.assignmentRepo.find({
    where: { patient: { patientid: report.patient.patientid } },
    relations: ['doctor'],
    order: { assignmentid: 'DESC' },
  });

  const assignment = assignments[0];

  if (!assignment?.doctor) {
    throw new NotFoundException('No doctor assigned to this patient');
  }

  const doctor = assignment.doctor;

  if (!doctor.fcmtoken?.trim()) {
    throw new BadRequestException('Doctor has no registered device token');
  }

  // 3. Save comment if provided
  if (comment?.trim()) {
    report.comment = comment.trim();
    await this.reportRepo.save(report);
  }

  // 4. Send Firebase notification safely
  try {
    await this.firebaseService.sendReportToDoctor({
      fcmToken: doctor.fcmtoken,
      doctorName: doctor.fullname,
      patientName: report.patient.fullname,
      reportId: report.reportid,
      radiologistName: report.radiologist?.fullname ?? 'Radiologist',
      comment: report.comment ?? '',
    });

    return {
      message: `Report sent to Dr. ${doctor.fullname}`,
      reportId: report.reportid,
      doctorName: doctor.fullname,
    };
  } catch (error) {
    // Optional: clear invalid token
    if (error?.errorInfo?.code === 'messaging/invalid-argument') {
      doctor.fcmtoken = null;
      await this.doctorRepo.save(doctor);
    }

    return {
      message: `Report linked to Dr. ${doctor.fullname}, but notification could not be sent`,
      reportId: report.reportid,
      doctorName: doctor.fullname,
      firebaseError: error?.message || 'Unknown Firebase error',
    };
  }
}

}
