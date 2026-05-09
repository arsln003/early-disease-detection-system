import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { StrokeReport } from './StrokeReport';

@Index('stroke_result_pkey', ['strokeresultid'], { unique: true })
@Entity('stroke_result', { schema: 'public' })
export class StrokeResult {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'strokeresultid' })
  strokeresultid: number;

  @Column('integer', {
    name: 'strokereportid',
    unique: true,
  })
  strokereportid: number;

  @Column('character varying', {
    name: 'prediction',
    nullable: true,
    length: 50,
  })
  prediction: string | null;

  @Column('integer', {
    name: 'prediction_class',
    nullable: true,
  })
  predictionClass: number | null;

  @Column('double precision', {
    name: 'confidence',
    nullable: true,
  })
  confidence: number | null;

  @Column('jsonb', {
    name: 'probabilities',
    nullable: true,
  })
  probabilities: {
    'No Stroke'?: number;
    Ischemia?: number;
    Hemorrhage?: number;
  } | null;

  @Column('boolean', {
    name: 'segmentation_generated',
    nullable: true,
  })
  segmentationGenerated: boolean | null;

  @Column('text', {
    name: 'result_image',
    nullable: true,
  })
  resultImage: string | null;

  @Column('text', {
    name: 'overlay_image',
    nullable: true,
  })
  overlayImage: string | null;

  @Column('text', {
    name: 'result_image_url',
    nullable: true,
  })
  resultImageUrl: string | null;

  @Column('text', {
    name: 'overlay_image_url',
    nullable: true,
  })
  overlayImageUrl: string | null;

  @Column('integer', {
    name: 'python_report_id',
    nullable: true,
  })
  pythonReportId: number | null;

  @Column('character varying', {
    name: 'device',
    nullable: true,
    length: 30,
  })
  device: string | null;

  @Column('text', {
    name: 'raw_result',
    nullable: true,
  })
  rawResult: string | null;

  @Column('character varying', {
    name: 'modelname',
    nullable: true,
    length: 100,
    default: () => "'STROKE_FINAL_MODEL_V2'",
  })
  modelname: string | null;

  @Column('timestamp without time zone', {
    name: 'processedat',
    nullable: true,
    default: () => 'CURRENT_TIMESTAMP',
  })
  processedat: Date | null;

  @OneToOne(() => StrokeReport, (strokeReport) => strokeReport.strokeResult, {
    onDelete: 'CASCADE',
  })
  @JoinColumn([
    {
      name: 'strokereportid',
      referencedColumnName: 'strokereportid',
    },
  ])
  strokeReport: StrokeReport;
}