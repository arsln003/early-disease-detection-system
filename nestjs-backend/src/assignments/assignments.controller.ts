import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';

@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  // Critical patients
  @Get(':doctorid/critical')
  async getCriticalPatientsByDoctor(
    @Param('doctorid', ParseIntPipe) doctorid: number,
  ) {
    return this.assignmentsService.findPatientsByDoctorAndClassification(
      doctorid,
      'Critical',
    );
  }

  // Moderate patients
  @Get(':doctorid/moderate')
  async getModeratePatientsByDoctor(
    @Param('doctorid', ParseIntPipe) doctorid: number,
  ) {
    return this.assignmentsService.findPatientsByDoctorAndClassification(
      doctorid,
      'Moderate',
    );
  }

  // Normal patients
  @Get(':doctorid/normal')
  async getNormalPatientsByDoctor(
    @Param('doctorid', ParseIntPipe) doctorid: number,
  ) {
    return this.assignmentsService.findPatientsByDoctorAndClassification(
      doctorid,
      'Normal',
    );
  }
}
