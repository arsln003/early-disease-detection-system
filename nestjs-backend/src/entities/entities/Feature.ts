import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Report } from './Report';

@Entity('feature')
export class Feature {
  @PrimaryGeneratedColumn()
  featureid: number;

  @Column({ nullable: true })
  id_number: number;

 @Column({ type: 'float', nullable: true })
age: number | null;

@Column({ type: 'float', nullable: true })
gender: number | null;

@Column({ type: 'float', nullable: true })
height: number | null;

@Column({ type: 'float', nullable: true })
weight: number | null;

@Column({ type: 'float', nullable: true })
ap_hi: number | null;

@Column({ type: 'float', nullable: true })
ap_lo: number | null;

@Column({ type: 'float', nullable: true })
cholesterol: number | null;

@Column({ type: 'float', nullable: true })
gluc: number | null;

@Column({ type: 'float', nullable: true })
smoke: number | null;

@Column({ type: 'float', nullable: true })
alco: number | null;

@Column({ type: 'float', nullable: true })
active: number | null;

@Column({ type: 'float', nullable: true })
cardio: number | null;

  @OneToOne(() => Report, (report) => report.feature, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportid' })
  report: Report;
}