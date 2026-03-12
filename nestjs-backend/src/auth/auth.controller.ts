import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ---------- ADMIN LOGIN ----------
  @UseGuards(AuthGuard('admin-local'))
  @Post('admin/login')
  async adminLogin(@Request() req) {
    return this.authService.login(req.user);
  }

  // ---------- DOCTOR LOGIN ----------
  @UseGuards(AuthGuard('doctor-local'))
  @Post('doctor/login')
  async doctorLogin(@Request() req) {
    return this.authService.doctorLogin(req.user);
  }

// ---------- Radiologist LOGIN ----------
@UseGuards(AuthGuard('radiologist-local'))
@Post('radiologist/login')
radiologistLogin(@Request() req) {
  return this.authService.radiologistLogin(req.user);
}

}
