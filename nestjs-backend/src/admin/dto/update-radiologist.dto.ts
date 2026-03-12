import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateRadiologistDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  contactnumber?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
