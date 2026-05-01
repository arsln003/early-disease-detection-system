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
import { CadicaResult } from './CadicaResult';

@Index('cadica_video_report_pkey', ['cadicavideoreportid'], { unique: true })
@Entity('cadica_video_report', { schema: 'public' })
export class CadicaVideoReport {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cadicavideoreportid' })
  cadicavideoreportid: number;

  @Column('jsonb', { name: 'videos' })
  videos: {
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
  }[];

  @Column('text', { name: 'comment', nullable: true })
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

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn([{ name: 'patientid', referencedColumnName: 'patientid' }])
  patient: Patient;

  @ManyToOne(() => Radiologist, { onDelete: 'SET NULL' })
  @JoinColumn([
    { name: 'radiologistid', referencedColumnName: 'radiologistid' },
  ])
  radiologist: Radiologist;

  @OneToOne(() => CadicaResult, (cadicaResult) => cadicaResult.cadicaVideoReport)
  cadicaResult: CadicaResult;
}