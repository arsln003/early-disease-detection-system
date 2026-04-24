// src/auth/strategies/radiologist-local.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class RadiologistLocalStrategy extends PassportStrategy(Strategy, 'radiologist-local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }
  validate(email: string, password: string) {
    return this.authService.validateRadiologist(email, password);
  }
}