// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET ?? 'SUPER_SECRET_KEY',
    });
  }

  validate(payload: { sub: number; email: string; role: string }) {
    if (!payload.role) throw new UnauthorizedException();
    // whatever you return here becomes req.user
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}