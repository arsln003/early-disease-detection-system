import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from 'src/entities/entities/Patient';
import { Doctor } from 'src/entities/entities/Doctor';
import { Admin } from 'src/entities/entities/Admin';
import { Assignment } from 'src/entities/entities/Assignment';
import { CreatePatientDto } from 'src/admin/dto/create-patient.dto';
import { validate } from 'class-validator';
import { UpdatePatientDto } from 'src/admin/dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
      @InjectRepository(Doctor)           // ✅ add
    private readonly doctorRepository: Repository<Doctor>,

    @InjectRepository(Admin)            // ✅ add
    private readonly adminRepository: Repository<Admin>,

    @InjectRepository(Assignment)       // ✅ add
    private readonly assignmentRepository: Repository<Assignment>,
  ) {}



  // ---- GET ALL ----
async findAllPatients() {
  const patients = await this.patientRepository.find({
    relations: [
      'assignments',
      'assignments.doctor',
      'assignments.assignedby',

      'reports',
      'reports.radiologist',

      'cadicaVideoReports',
      'cadicaVideoReports.radiologist',

      'strokeReports',
      'strokeReports.radiologist',
    ],
    order: {
      patientid: 'ASC',
    },
  });

  return {
    message: 'Patients fetched successfully',
    total: patients.length,
    patients: patients.map((patient) => {
      const assignments = patient.assignments || [];

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
            assignmentid: latestAssignment.assignmentid,
            assignedat: latestAssignment.assignedat,

            doctorid: latestAssignment.doctor.doctorid,
            fullname: latestAssignment.doctor.fullname,
            specialization: latestAssignment.doctor.specialization,
            email: latestAssignment.doctor.email,
            experience: latestAssignment.doctor.experience,
            contactnumber: latestAssignment.doctor.contactnumber,
            status: latestAssignment.doctor.status,
            createdat: latestAssignment.doctor.createdat,

            assignedby: latestAssignment.assignedby
              ? {
                  adminid: latestAssignment.assignedby.adminid,
                  fullname: latestAssignment.assignedby.fullname,
                  email: latestAssignment.assignedby.email,
                }
              : null,
          }
        : null;

      return {
        patientid: patient.patientid,
        fullname: patient.fullname,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        contactnumber: patient.contactnumber,
        address: patient.address,
        createdat: patient.createdat,

        assignedDoctor,

        assignments: assignments.map((assignment) => ({
          assignmentid: assignment.assignmentid,
          assignedat: assignment.assignedat,

          doctor: assignment.doctor
            ? {
                doctorid: assignment.doctor.doctorid,
                fullname: assignment.doctor.fullname,
                specialization: assignment.doctor.specialization,
                email: assignment.doctor.email,
                experience: assignment.doctor.experience,
                contactnumber: assignment.doctor.contactnumber,
                status: assignment.doctor.status,
              }
            : null,

          assignedby: assignment.assignedby
            ? {
                adminid: assignment.assignedby.adminid,
                fullname: assignment.assignedby.fullname,
                email: assignment.assignedby.email,
              }
            : null,
        })),

        reports: (patient.reports || []).map((report) => ({
          reportid: report.reportid,
          filename: report.filename,
          filepath: report.filepath,
          comment: report.comment,
          uploadedat: report.uploadedat,

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
        })),

        cadicaVideoReports: (patient.cadicaVideoReports || []).map(
          (cadicaReport) => ({
            cadicavideoreportid: cadicaReport.cadicavideoreportid,
            videos: cadicaReport.videos,
            comment: cadicaReport.comment,
            status: cadicaReport.status,
            uploadedat: cadicaReport.uploadedat,

            radiologist: cadicaReport.radiologist
              ? {
                  radiologistid: cadicaReport.radiologist.radiologistid,
                  fullname: cadicaReport.radiologist.fullname,
                  email: cadicaReport.radiologist.email,
                  contactnumber: cadicaReport.radiologist.contactnumber,
                  status: cadicaReport.radiologist.status,
                  createdat: cadicaReport.radiologist.createdat,
                }
              : null,
          }),
        ),

        strokeReports: (patient.strokeReports || []).map((strokeReport) => ({
          strokereportid: strokeReport.strokereportid,
          filename: strokeReport.filename,
          filepath: strokeReport.filepath,
          mimetype: strokeReport.mimetype,
          size: strokeReport.size,
          comment: strokeReport.comment,
          status: strokeReport.status,
          uploadedat: strokeReport.uploadedat,

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
        })),
      };
    }),
  };
}
 
async createPatient(dto: CreatePatientDto, adminId: number): Promise<any> {
  // 1️⃣ Check duplicate email
  const existing = await this.patientRepository.findOne({
    where: { email: dto.email },
  });
  if (existing) {
    throw new ConflictException('Patient with this email already exists');
  }

  // 2️⃣ Check admin exists
  const admin = await this.adminRepository.findOne({
    where: { adminid: adminId },
  });
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  // 3️⃣ Save patient
  const patient = this.patientRepository.create({
    fullname: dto.fullname,
    email: dto.email,
    age: dto.age ?? null,
    gender: dto.gender ?? null,
    contactnumber: dto.contactnumber ?? null,
    address: dto.address ?? null,
    createdby: admin,
  });
  const savedPatient = await this.patientRepository.save(patient);

  // 4️⃣ If doctorName provided → find doctor by name and create assignment
  if (dto.doctorName) {
    const doctor = await this.doctorRepository.findOne({
      where: { fullname: dto.doctorName },  // ✅ search by name
    });
    if (!doctor) {
      throw new NotFoundException(
        `Doctor with name "${dto.doctorName}" not found`,
      );
    }

    const assignment = this.assignmentRepository.create({
      patient: savedPatient,
      doctor,
      assignedby: admin,
    });
    await this.assignmentRepository.save(assignment);

    return {
      message: 'Patient created and doctor assigned successfully',
      patient: savedPatient,
      assignment: {
        assignmentid: assignment.assignmentid,
        doctorid: doctor.doctorid,
        doctorName: doctor.fullname,
        assignedat: assignment.assignedat,
      },
    };
  }

  // 5️⃣ No doctorName → just return patient
  return {
    message: 'Patient created successfully. You can assign a doctor later.',
    patient: savedPatient,
  };
}


  // ── ASSIGN DOCTOR (first time) ─────────────────────────────────────────
async assignDoctor(
  patientId: number,
  doctorName: string,
  adminId: number,
): Promise<any> {
  const patient = await this.patientRepository.findOne({
    where: { patientid: patientId },
  });
  if (!patient) {
    throw new NotFoundException(`Patient with id ${patientId} not found`);
  }

  const doctor = await this.doctorRepository.findOne({
    where: { fullname: doctorName },   // ✅ search by name
  });
  if (!doctor) {
    throw new NotFoundException(`Doctor with name "${doctorName}" not found`);
  }

  const admin = await this.adminRepository.findOne({
    where: { adminid: adminId },
  });
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  // Check if already assigned to this doctor
  const alreadyAssigned = await this.assignmentRepository.findOne({
    where: {
      patient: { patientid: patientId },
      doctor: { doctorid: doctor.doctorid },
    },
  });
  if (alreadyAssigned) {
    throw new ConflictException(
      `Patient is already assigned to Dr. ${doctorName}`,
    );
  }

  const assignment = this.assignmentRepository.create({
    patient,
    doctor,
    assignedby: admin,
  });
  await this.assignmentRepository.save(assignment);

  return {
    message: 'Doctor assigned successfully',
    assignment: {
      assignmentid: assignment.assignmentid,
      patientid: patient.patientid,
      patientName: patient.fullname,
      doctorid: doctor.doctorid,
      doctorName: doctor.fullname,
      assignedat: assignment.assignedat,
    },
  };
}

// ── REASSIGN DOCTOR (change existing) ─────────────────────────────────
async reassignDoctor(
  patientId: number,
  doctorName: string,
  adminId: number,
): Promise<any> {
  const patient = await this.patientRepository.findOne({
    where: { patientid: patientId },
  });
  if (!patient) {
    throw new NotFoundException(`Patient with id ${patientId} not found`);
  }

  const doctor = await this.doctorRepository.findOne({
    where: { fullname: doctorName },   // ✅ search by name
  });
  if (!doctor) {
    throw new NotFoundException(`Doctor with name "${doctorName}" not found`);
  }

  const admin = await this.adminRepository.findOne({
    where: { adminid: adminId },
  });
  if (!admin) {
    throw new NotFoundException('Admin not found');
  }

  // Remove all previous assignments for this patient
  await this.assignmentRepository.delete({
    patient: { patientid: patientId },
  });

  // Create new assignment
  const assignment = this.assignmentRepository.create({
    patient,
    doctor,
    assignedby: admin,
  });
  await this.assignmentRepository.save(assignment);

  return {
    message: 'Doctor reassigned successfully',
    assignment: {
      assignmentid: assignment.assignmentid,
      patientid: patient.patientid,
      patientName: patient.fullname,
      doctorid: doctor.doctorid,
      doctorName: doctor.fullname,
      assignedat: assignment.assignedat,
    },
  };
}






  // ---- DELETE ----
  async deletePatient(id: number): Promise<void> {
    const result = await this.patientRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Patient with id ${id} not found`);
    }
  }

async updatePatient(id: number, updateData: UpdatePatientDto): Promise<Patient> {
  // 1️⃣ Check if patient exists
  const patient = await this.patientRepository.findOneBy({ patientid: id });
  if (!patient) {
    throw new NotFoundException(`Patient with id ${id} not found`);
  }

  // 2️⃣ If updating email, check for duplicates
  if (updateData.email) {
    const existing = await this.patientRepository.findOne({
      where: { email: updateData.email }
    });

    if (existing && existing.patientid !== id) {
      throw new ConflictException('Email is already used by another patient');
    }
  }

  // 3️⃣ Update allowed fields
  Object.assign(patient, updateData);

  // 4️⃣ Save updated patient
  return await this.patientRepository.save(patient);
}

}
