import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';
import { Doctor } from 'src/entities/entities/Doctor';

@Injectable()
export class DoctorLocalStrategy extends PassportStrategy(Strategy, 'doctor-local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' }); // doctor logs in with email
  }

  async validate(email: string, password: string): Promise<Doctor> {
    return this.authService.validateDoctor(email, password);
  }
}
