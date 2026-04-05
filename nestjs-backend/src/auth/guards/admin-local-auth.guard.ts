// src/auth/guards/admin-local.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class AdminLocalGuard extends AuthGuard('admin-local') {}