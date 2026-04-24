import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Assignment } from 'src/entities/entities/Assignment';
import { Doctor } from 'src/entities/entities/Doctor';
import { Radiologist } from 'src/entities/entities/Radiologist';
@Injectable()
export class AssignmentsService {
  constructor(
    @InjectRepository(Assignment)
    private readonly assignmentRepository: Repository<Assignment>,

    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,

  ) {}

  // Get patients assigned to a doctor by classification with full info
async findPatientsByDoctorAndClassification(
  doctorid: number,
  classification: 'Critical' | 'Moderate' | 'Normal',
) {
  // Check if doctor exists
  const doctor = await this.doctorRepository.findOneBy({ doctorid });
  if (!doctor) {
    throw new NotFoundException(`Doctor with id ${doctorid} not found`);
  }

  // Fetch all assignments with full relations
  const assignments = await this.assignmentRepository.find({
    where: { doctor: { doctorid } },
    relations: [
      'doctor',
      'patient',
      'patient.reports',
      'patient.reports.aiResult',
    ],
  });

  // Filter assignments so that we keep each patient only once
  const uniquePatientsMap = new Map<number, any>();

  assignments.forEach((assignment) => {
    const patient = assignment.patient;

    // Check if patient has at least one report with the classification
    const hasMatchingReport = patient.reports.some(
      (report) => report.aiResult?.classification === classification,
    );

    if (hasMatchingReport && !uniquePatientsMap.has(patient.patientid)) {
      uniquePatientsMap.set(patient.patientid, assignment);
    }
  });

  const filteredAssignments = Array.from(uniquePatientsMap.values());

  if (filteredAssignments.length === 0) {
    throw new NotFoundException(
      `No ${classification.toLowerCase()} patients found for doctor with id ${doctorid}`,
    );
  }

  return filteredAssignments;
}



}