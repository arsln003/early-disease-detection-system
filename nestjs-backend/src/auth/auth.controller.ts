// src/auth/auth.controller.ts
import { Controller, Post, Request, UseGuards, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLocalGuard } from './guards/admin-local-auth.guard';
import { DoctorLocalGuard } from './guards/doctor-local-auth.guard';
import { RadiologistLocalGuard } from './guards/radiologist-local-auth.guard';
import { ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginResponseDto } from './dto/login-response.dto';  // Import the DTO
import { LoginRequestDto } from './dto/login-request.dto';  // Import the request DTO

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(AdminLocalGuard)       // runs AdminLocalStrategy → sets req.user
  @HttpCode(200)
  @Post('admin/login')
    @ApiBody({ type: LoginRequestDto, description: 'Admin login credentials (email & password)' })  // Specify the request body
  @ApiResponse({ status: 200, description: 'Admin login successful', type: LoginResponseDto })  // Use the DTO for response
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  adminLogin(@Request() req) {
    return this.authService.loginAdmin(req.user);
    // returns { access_token: "..." }
  }

  @UseGuards(DoctorLocalGuard)
  @HttpCode(200)
  @Post('doctor/login')
  @ApiBody({ type: LoginRequestDto, description: 'Doctor login credentials (email & password)' })  // Specify the request body
  @ApiResponse({ status: 200, description: 'Doctor login successful', type: LoginResponseDto })  // Use the DTO for response
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  doctorLogin(@Request() req) {
    return this.authService.loginDoctor(req.user);
  }

  @UseGuards(RadiologistLocalGuard)
  @HttpCode(200)
  @Post('radiologist/login')
    @ApiBody({ type: LoginRequestDto, description: 'Radiologist login credentials (email & password)' })  // Specify the request body
  @ApiResponse({ status: 200, description: 'Radiologist login successful', type: LoginResponseDto })  // Use the DTO for response
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  radiologistLogin(@Request() req) {
    return this.authService.loginRadiologist(req.user);
  }
}