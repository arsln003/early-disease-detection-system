import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from 'src/entities/entities/Doctor';
import { Assignment } from 'src/entities/entities/Assignment';
import { AuthModule } from 'src/auth/auth.module';
@Module({
  imports: [TypeOrmModule.forFeature([Doctor,Assignment]), AuthModule], // register Doctor entity
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService,TypeOrmModule], 
})
export class DoctorsModule {}
