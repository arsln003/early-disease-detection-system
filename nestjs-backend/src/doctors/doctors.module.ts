import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsService } from './doctors.service';
import { DoctorsController } from './doctors.controller';
import { Doctor } from 'src/entities/entities/Doctor';
import { Assignment } from 'src/entities/entities/Assignment';
import { AuthModule } from 'src/auth/auth.module';
import { AiResult } from 'src/entities/entities/AiResult';
import { Feature } from 'src/entities/entities/Feature';
import { Report } from 'src/entities/entities/Report';
import { PredictionModule } from 'src/prediction/prediction.module'; // ← add
import {CadicaModule} from 'src/cadica/cadica.module'; // ← add
@Module({
  imports: [TypeOrmModule.forFeature([Doctor,Assignment,AiResult,Feature,Report]), AuthModule, PredictionModule, CadicaModule,], // register Doctor entity
  providers: [DoctorsService],
  controllers: [DoctorsController],
  exports: [DoctorsService,TypeOrmModule], 
})
export class DoctorsModule {}
