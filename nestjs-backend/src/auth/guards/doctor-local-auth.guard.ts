
// src/auth/guards/doctor-local.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class DoctorLocalGuard extends AuthGuard('doctor-local') {}
