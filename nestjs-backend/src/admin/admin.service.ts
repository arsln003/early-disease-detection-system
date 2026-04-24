// admin/admin.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from 'src/entities/entities/Doctor';
import { Patient } from 'src/entities/entities/Patient';
import { Report } from 'src/entities/entities/Report';
import { Admin } from 'src/entities/entities/Admin';
import * as bcrypt from 'bcrypt';
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,

    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
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

   // Method to add admin
  async addAdmin(
    fullname: string,
    email: string,
    password: string,
    contactnumber: string,
    role: string = 'Admin',
  ): Promise<Admin> {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = this.adminRepository.create({
      fullname,
      email,
      password: hashedPassword,
      contactnumber,
      role,
    });

    return this.adminRepository.save(newAdmin);
  }


}