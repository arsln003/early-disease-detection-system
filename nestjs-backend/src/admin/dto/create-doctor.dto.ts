// admin/dto/create-doctor.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateDoctorDto {
  // Required fields
  @IsNotEmpty()
  @IsString()
  fullname: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  // Optional fields
  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @IsOptional()
  @IsString()
  contactnumber?: string;

  @IsOptional()
  @IsString()
  status?: string; // default 'Active' if not provided

}
