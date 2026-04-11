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

//update
// async updateDoctor(
//   id: number,
//   data: UpdateDoctorDto,
// ): Promise<Doctor> {
//   const doctor = await this.doctorRepository.findOneBy({ doctorid: id });
//   if (!doctor) {
//     throw new NotFoundException(`Doctor with id ${id} not found`);
//   }

//   // Only include allowed fields
//   const allowedData: Partial<Pick<Doctor, 'fullname' | 'specialization' | 'email' | 'status'>> = {
//     fullname: data.fullname,
//     specialization: data.specialization,
//     email: data.email,
//     status: data.status,
//   };

//   await this.doctorRepository.update(id, allowedData);
//   return await this.doctorRepository.findOneByOrFail({ doctorid: id });
// }

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


// get assigned patient info
// doctor → assignments → patient → reports → aiResult
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
    relations: ['patient', 'patient.reports', 'patient.reports.aiResult'],
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

      assignment.patient.reports = assignment.patient.reports.map((report) => {
        const ai = report.aiResult;

        if (ai && ai.probability != null) {
          const risk = Number(ai.probability)*100; // convert to percentage
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

      const { doctor, ...cleanedAssignment } = assignment as any;

      return {
        ...cleanedAssignment,
        patientRiskCategory: patientRiskCategory || 'No AI Result',
      };
    })
    // 3) apply severity filter
    .filter((item) => {
      if (severity === 'all') return true;

      const cat = (item.patientRiskCategory || '').toLowerCase();
      return cat === severity.toLowerCase();
    });

  return enhancedAssignments;
}


}