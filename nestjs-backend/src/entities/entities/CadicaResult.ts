import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CadicaVideoReport } from './CadicaVideoReport';

@Entity('cadica_result', { schema: 'public' })
export class CadicaResult {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'cadicaresultid' })
  cadicaresultid: number;

  @Column('integer', { name: 'cadicavideoreportid', unique: true })
  cadicavideoreportid: number;

  @Column('character varying', {
    name: 'verdict',
    nullable: true,
    length: 50,
  })
  verdict: string | null;

  @Column('double precision', {
    name: 'confidence',
    nullable: true,
  })
  confidence: number | null;

  @Column('double precision', {
    name: 'weighted_avg_prob',
    nullable: true,
  })
  weightedAvgProb: number | null;

  @Column('character varying', {
    name: 'most_suspicious_video',
    nullable: true,
    length: 100,
  })
  mostSuspiciousVideo: string | null;

  @Column('double precision', {
    name: 'most_suspicious_prob',
    nullable: true,
  })
  mostSuspiciousProb: number | null;

  @Column('integer', {
    name: 'videos_processed',
    nullable: true,
  })
  videosProcessed: number | null;

  @Column('integer', {
    name: 'videos_skipped',
    nullable: true,
  })
  videosSkipped: number | null;

  @Column('text', {
    name: 'raw_result',
    nullable: true,
  })
  rawResult: string | null;

  @Column('character varying', {
    name: 'modelname',
    nullable: true,
    length: 100,
    default: () => "'CADICA_THIRD_MODEL_V2'",
  })
  modelname: string | null;

  @Column('timestamp without time zone', {
    name: 'processedat',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  processedat: Date | null;

  @OneToOne(
    () => CadicaVideoReport,
    (cadicaVideoReport) => cadicaVideoReport.cadicaResult,
    { onDelete: 'CASCADE' },
  )
  @JoinColumn([
    {
      name: 'cadicavideoreportid',
      referencedColumnName: 'cadicavideoreportid',
    },
  ])
  cadicaVideoReport: CadicaVideoReport;
}