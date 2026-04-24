import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRadiologistDto {
  @IsNotEmpty()
  @IsString()
  fullname: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  contactnumber?: string;

  @IsOptional()
  @IsString()
  status?: string; // "Active" | "Inactive"
}
