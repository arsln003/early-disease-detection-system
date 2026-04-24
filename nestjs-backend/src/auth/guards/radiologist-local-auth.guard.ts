
// src/auth/guards/radiologist-local.guard.ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
@Injectable()
export class RadiologistLocalGuard extends AuthGuard('radiologist-local') {}
