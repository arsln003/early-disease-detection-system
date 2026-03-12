import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';
import { Admin } from 'src/entities//entities/Admin';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'admin-local') {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' }); // use email instead of username
  }

  async validate(email: string, password: string): Promise<Admin> {
    return this.authService.validateAdmin(email, password);
  }
}
