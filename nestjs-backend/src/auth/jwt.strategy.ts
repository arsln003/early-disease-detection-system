import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy, 'admin-jwt')
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'SUPER_SECRET_KEY_CHANGE_ME', // same as in JwtModule
    });
  }

  async validate(payload: any) {
    // what becomes req.user
    return {
      adminid: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
