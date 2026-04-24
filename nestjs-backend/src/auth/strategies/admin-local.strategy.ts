// src/auth/strategies/admin-local.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from '../auth.service';

@Injectable()
export class AdminLocalStrategy extends PassportStrategy(Strategy, 'admin-local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }
  validate(email: string, password: string) {
    return this.authService.validateAdmin(email, password); // returned value → req.user
  }
}