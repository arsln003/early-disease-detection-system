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
findAllPatients(): Promise<Patient[]> {
  return this.patientRepository.find({
    relations: [
      'assignments',         // Get related assignments for each patient
      'assignments.doctor',  // Get doctor details for each assignment
      'assignments.assignedby', // Get admin details (who assigned)
      'reports',             // Get reports for the patient
      'reports.radiologist', // Get radiologist details for each report
      'cadicaVideoReports',  // Get related cadica video reports
      'cadicaVideoReports.cadicaResult', // Get cadica result details
    ], 
  });
}




// async createPatient(patientData: CreatePatientDto): Promise<Patient> {
//   // 1️⃣ Check required fields
//   if (!patientData.fullname || !patientData.email) {
//     throw new BadRequestException('fullname and email are required');
//   }

//   // 2️⃣ Check if email already exists
//   const existingPatient = await this.patientRepository.findOne({
//     where: { email: patientData.email },
//   });

//   if (existingPatient) {
//     throw new ConflictException('Patient with this email already exists');
//   }

//   // 3️⃣ Create and save patient
//   const patient = this.patientRepository.create({
//     fullname: patientData.fullname,
//     email: patientData.email,
//     contactnumber: patientData.contactnumber ?? null,
//     age: patientData.age ?? null,
//     gender: patientData.gender ?? null,
//     address: patientData.address ?? null,
//   });

//   return this.patientRepository.save(patient);
// }

 
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
