import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from 'src/entities/entities/Doctor';
import { Assignment } from 'src/entities/entities/Assignment';
@Module({
  imports: [TypeOrmModule.forFeature([Doctor,Assignment])], // register Doctor entity
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService], 
})
export class DoctorsModule {}
