import { IsOptional, IsString, IsInt, Min, IsEmail } from 'class-validator';

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  contactnumber?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
