import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CadicaService } from './cadica.service';
import { Assignment } from 'src/entities/entities/Assignment';
import { Report } from 'src/entities/entities/Report';
import { CadicaResult } from 'src/entities/entities/CadicaResult';
import { CadicaVideoReport } from 'src/entities/entities/CadicaVideoReport';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Assignment,
      Report,
      CadicaVideoReport,
      CadicaResult,
    ]),
  ],
  providers: [CadicaService],
  exports: [CadicaService],
})
export class CadicaModule {}