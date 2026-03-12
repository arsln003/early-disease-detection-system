// admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from 'src/entities/entities/Doctor';
import { Patient } from 'src/entities/entities/Patient';
import { Report } from 'src/entities/entities/Report';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
  ) {}

  // 🔹 Dashboard Stats
  async getDashboardStats() {
    const [totalDoctors, totalPatients, totalReports] = await Promise.all([
      this.doctorRepository.count(),
      this.patientRepository.count(),
      this.reportRepository.count(),
    ]);

    return {
      totalDoctors,
      totalPatients,
      totalReports,
    };
  }
}