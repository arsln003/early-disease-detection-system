import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsService } from './assignments.service';
import { AssignmentsController } from './assignments.controller';
import { Assignment } from 'src/entities/entities/Assignment'; // <-- import entity
import { Doctor } from 'src/entities/entities/Doctor';

@Module({
  imports: [TypeOrmModule.forFeature([Assignment,Doctor])], // <-- important!
  providers: [AssignmentsService],
  controllers: [AssignmentsController],
})
export class AssignmentsModule {}
