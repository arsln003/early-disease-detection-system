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

  @Column({ nullable: true })
  age: number;

  @Column({ nullable: true })
  gender: number;

  @Column({ nullable: true })
  height: number;

  @Column('float', { nullable: true })
  weight: number;

  @Column({ nullable: true })
  ap_hi: number;

  @Column({ nullable: true })
  ap_lo: number;

  @Column({ nullable: true })
  cholesterol: number;

  @Column({ nullable: true })
  gluc: number;

  @Column({ nullable: true })
  smoke: number;

  // NEW FEATURES
  @Column({ nullable: true })
  alco: number;

  @Column({ nullable: true })
  active: number;

  @Column({ nullable: true })
  cardio: number;

  @OneToOne(() => Report, (report) => report.feature, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'reportid' })
  report: Report;
}