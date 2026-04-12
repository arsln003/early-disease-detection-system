// src/admin/dto/assign-doctor.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class AssignDoctorDto {
  @IsNotEmpty()
  @IsString()
  doctorName: string;  // ✅ changed from doctorId to doctorName
}