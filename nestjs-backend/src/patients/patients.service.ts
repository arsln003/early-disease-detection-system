import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from 'src/entities/entities/Patient';
import { CreatePatientDto } from 'src/admin/dto/create-patient.dto';
import { validate } from 'class-validator';
import { UpdatePatientDto } from 'src/admin/dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  // ---- GET ALL ----
  findAllPatients(): Promise<Patient[]> {
    return this.patientRepository.find({
      relations: ['assignments', 'reports', 'createdby'], // optional
    });
  }


async createPatient(patientData: CreatePatientDto): Promise<Patient> {
  // 1️⃣ Check required fields
  if (!patientData.fullname || !patientData.email) {
    throw new BadRequestException('fullname and email are required');
  }

  // 2️⃣ Check if email already exists
  const existingPatient = await this.patientRepository.findOne({
    where: { email: patientData.email },
  });

  if (existingPatient) {
    throw new ConflictException('Patient with this email already exists');
  }

  // 3️⃣ Create and save patient
  const patient = this.patientRepository.create({
    fullname: patientData.fullname,
    email: patientData.email,
    contactnumber: patientData.contactnumber ?? null,
    age: patientData.age ?? null,
    gender: patientData.gender ?? null,
    address: patientData.address ?? null,
  });

  return this.patientRepository.save(patient);
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
