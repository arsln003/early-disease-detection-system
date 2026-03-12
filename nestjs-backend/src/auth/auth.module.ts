import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';

import { Admin } from 'src/entities/entities/Admin';
import { DoctorLocalStrategy } from './doctor-local.strategy';
import { Doctor } from 'src/entities/entities/Doctor';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RadiologistLocalStrategy } from './radiologist-local.strategy';
import { Radiologist } from 'src/entities/entities/Radiologist';


@Module({
  imports: [
    TypeOrmModule.forFeature([Admin,Doctor,Radiologist]),
    PassportModule,
    JwtModule.register({
      secret: 'SUPER_SECRET_KEY_CHANGE_ME',   // move to .env later
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, DoctorLocalStrategy,JwtStrategy,RadiologistLocalStrategy,RolesGuard,Reflector],
  exports: [AuthService],
})
export class AuthModule {}
