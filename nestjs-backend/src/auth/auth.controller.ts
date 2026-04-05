// src/auth/auth.controller.ts
import { Controller, Post, Request, UseGuards, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLocalGuard } from './guards/admin-local-auth.guard';
import { DoctorLocalGuard } from './guards/doctor-local-auth.guard';
import { RadiologistLocalGuard } from './guards/radiologist-local-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AdminLocalGuard)       // runs AdminLocalStrategy → sets req.user
  @HttpCode(200)
  @Post('admin/login')
  adminLogin(@Request() req) {
    return this.authService.loginAdmin(req.user);
    // returns { access_token: "..." }
  }

  @UseGuards(DoctorLocalGuard)
  @HttpCode(200)
  @Post('doctor/login')
  doctorLogin(@Request() req) {
    return this.authService.loginDoctor(req.user);
  }

  @UseGuards(RadiologistLocalGuard)
  @HttpCode(200)
  @Post('radiologist/login')
  radiologistLogin(@Request() req) {
    return this.authService.loginRadiologist(req.user);
  }
}