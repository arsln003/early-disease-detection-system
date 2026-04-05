// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';

export type Role = 'admin' | 'doctor' | 'radiologist';
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);