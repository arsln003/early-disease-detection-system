// src/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt'; // Ensure bcrypt is installed
import { Radiologist } from 'src/entities/entities/Radiologist';
import { Admin } from 'src/entities/entities/Admin';
import { Doctor } from 'src/entities/entities/Doctor';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminRepository: Repository<Admin>,
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Radiologist)
    private readonly radiologistRepository: Repository<Radiologist>,
    private readonly jwtService: JwtService,
  ) {}

  // ... Admin logic same rahegi agar wo plain text use kar raha hai ...
async validateAdmin(email: string, password: string): Promise<Admin> {
    const admin = await this.adminRepository.findOne({ where: { email } });

    if (!admin) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // plain text for admin (you can change to bcrypt later)
    const passwordValid = admin.password === password;

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return admin;
  }

  async login(admin: Admin) {
    const payload = {
      sub: admin.adminid,
      email: admin.email,
      role: admin.role || 'Admin',
    };

    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // ---------- DOCTOR ----------
  async validateDoctor(email: string, password: string): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({ where: { email } });

    if (!doctor) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // --- FIX IS HERE ---
    // Direct '===' hata kar wapis bcrypt.compare use karein
    const passwordValid = await bcrypt.compare(password, doctor.password);
    
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return doctor;
  }

  async doctorLogin(doctor: Doctor) {
    const payload = {
      sub: doctor.doctorid,
      email: doctor.email,
      role: 'Doctor',
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  // -------- RADIOLOGIST LOGIN --------
  async validateRadiologist(email: string, password: string): Promise<Radiologist> {
    const user = await this.radiologistRepository.findOne({ where: { email } });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // --- FIX IS HERE ---
    const valid = await bcrypt.compare(password, user.password);
    
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  async radiologistLogin(radiologist: Radiologist) {
    const payload = {
      sub: radiologist.radiologistid,
      email: radiologist.email,
      role: 'Radiologist',
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}