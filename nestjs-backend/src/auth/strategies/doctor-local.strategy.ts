// src/auth/strategies/doctor-local.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class DoctorLocalStrategy extends PassportStrategy(Strategy, 'doctor-local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }
  validate(email: string, password: string) {
    return this.authService.validateDoctor(email, password);
  }
}