import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Patient } from './Patient';
import { Radiologist } from './Radiologist';
import { StrokeResult } from './StrokeResult';

@Index('stroke_report_pkey', ['strokereportid'], { unique: true })
@Entity('stroke_report', { schema: 'public' })
export class StrokeReport {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'strokereportid' })
  strokereportid: number;

  @Column('character varying', {
    name: 'filename',
    length: 255,
  })
  filename: string;

  @Column('text', {
    name: 'filepath',
  })
  filepath: string;

  @Column('character varying', {
    name: 'mimetype',
    nullable: true,
    length: 100,
  })
  mimetype: string | null;

  @Column('integer', {
    name: 'size',
    nullable: true,
  })
  size: number | null;

  @Column('text', {
    name: 'comment',
    nullable: true,
  })
  comment: string | null;

  @Column('character varying', {
    name: 'status',
    nullable: true,
    length: 30,
    default: () => "'PENDING'",
  })
  status: string | null;

  @Column('timestamp without time zone', {
    name: 'uploadedat',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  uploadedat: Date | null;

  @ManyToOne(() => Patient, (patient) => patient.strokeReports, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([{ name: 'patientid', referencedColumnName: 'patientid' }])
  patient: Patient;

  @ManyToOne(() => Radiologist, (radiologist) => radiologist.strokeReports, {
    onDelete: 'SET NULL',
  })
  @JoinColumn([
    { name: 'radiologistid', referencedColumnName: 'radiologistid' },
  ])
  radiologist: Radiologist;

  @OneToOne(() => StrokeResult, (strokeResult) => strokeResult.strokeReport)
  strokeResult: StrokeResult;
}