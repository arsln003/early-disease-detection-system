import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // @Get('radiologist/:id')
  // getReportsByRadiologist(@Param('id', ParseIntPipe) id: number) {
  //   return this.reportsService.getReportsByRadiologistId(id);
  // }

  
}
