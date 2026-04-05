// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { Admin } from 'src/entities/entities/Admin';
import { Doctor } from 'src/entities/entities/Doctor';
import { Radiologist } from 'src/entities/entities/Radiologist';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

import { AdminLocalStrategy } from './strategies/admin-local.strategy';
import { DoctorLocalStrategy } from './strategies/doctor-local.strategy';
import { RadiologistLocalStrategy } from './strategies/radiologist-local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';

import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin, Doctor, Radiologist]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'SUPER_SECRET_KEY',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AdminLocalStrategy,
    DoctorLocalStrategy,
    RadiologistLocalStrategy,
    JwtStrategy,
    RolesGuard,
  ],
  exports: [AuthService, JwtModule, RolesGuard],
})
export class AuthModule {}