import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateDoctorFcmTokenDto {
  @IsNotEmpty()
  @IsString()
  fcmtoken: string;
}