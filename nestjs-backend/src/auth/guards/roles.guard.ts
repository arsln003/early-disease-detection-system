// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!required || required.length === 0) return true; // no roles = public

    const { user } = context.switchToHttp().getRequest();
    if (!required.includes(user?.role)) {
      throw new ForbiddenException(`Requires role: ${required.join(' or ')}`);
    }
    return true;
  }
}