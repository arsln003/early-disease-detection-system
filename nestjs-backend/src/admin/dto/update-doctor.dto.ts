// admin/dto/update-doctor.dto.ts
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
  
  @IsOptional()
  @IsString()
  status?: string; 

  // --- YE ADD KARNA HAI ---
  @IsOptional()
  @IsString()
  password?: string;
}