// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Admin } from 'src/entities/entities/Admin';
import { Doctor } from 'src/entities/entities/Doctor';
import { Radiologist } from 'src/entities/entities/Radiologist';
import { Role } from './decorators/roles.decorator';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepo: Repository<Admin>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Radiologist)
    private readonly radiologistRepo: Repository<Radiologist>,

    private readonly jwtService: JwtService,
  ) {}

  // ── helpers ──────────────────────────────────────────────────────────────

  private sign(id: number, email: string, role: Role) {
    return {
      access_token: this.jwtService.sign({ sub: id, email, role }),
    };
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  async validateAdmin(email: string, password: string): Promise<Admin> {
    const admin = await this.adminRepo.findOne({ where: { email } });
    if (!admin || !(await bcrypt.compare(password, admin.password))) {
      throw new UnauthorizedException('Invalid admin credentials');
    }
    return admin;
  }

  loginAdmin(admin: Admin) {
    return this.sign(admin.adminid, admin.email, 'admin');
  }

  // ── Doctor ────────────────────────────────────────────────────────────────

  async validateDoctor(email: string, password: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { email } });
    if (!doctor || !(await bcrypt.compare(password, doctor.password))) {
      throw new UnauthorizedException('Invalid doctor credentials');
    }
    return doctor;
  }

  loginDoctor(doctor: Doctor) {
    return this.sign(doctor.doctorid, doctor.email, 'doctor');
  }

  // ── Radiologist ───────────────────────────────────────────────────────────

  async validateRadiologist(email: string, password: string): Promise<Radiologist> {
    const radiologist = await this.radiologistRepo.findOne({ where: { email } });
    if (!radiologist || !(await bcrypt.compare(password, radiologist.password))) {
      throw new UnauthorizedException('Invalid radiologist credentials');
    }
    return radiologist;
  }

  loginRadiologist(radiologist: Radiologist) {
    return this.sign(radiologist.radiologistid, radiologist.email, 'radiologist');
  }
}