import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';
import { Radiologist } from 'src/entities/entities/Radiologist';

@Injectable()
export class RadiologistLocalStrategy extends PassportStrategy(Strategy, 'radiologist-local') {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<Radiologist> {
    return this.authService.validateRadiologist(email, password);
  }
}
