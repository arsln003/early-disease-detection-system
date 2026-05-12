

import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { AiResult } from "./AiResult";
import { Feature } from "./Feature";
import { Patient } from "./Patient";
import { Radiologist } from "./Radiologist";
import { CardioNlpResult } from "./CardioNlpResult";

@Index("report_pkey", ["reportid"], { unique: true })
@Entity("report", { schema: "public" })
export class Report {
  @PrimaryGeneratedColumn({ type: "integer", name: "reportid" })
  reportid: number;

  @Column("character varying", { name: "filename", length: 255 })
  filename: string;

  @Column("text", { name: "filepath" })
  filepath: string;

  @Column("text", { name: "comment", nullable: true })
  comment: string | null;

  @Column("timestamp without time zone", {
    name: "uploadedat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  uploadedat: Date | null;

  @ManyToOne(() => Patient, (patient) => patient.reports, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "patientid", referencedColumnName: "patientid" }])
  patient: Patient;

  @ManyToOne(() => Radiologist, (radiologist) => radiologist.reports, {
    onDelete: "SET NULL",
  })
  @JoinColumn([
    { name: "radiologistid", referencedColumnName: "radiologistid" },
  ])
  radiologist: Radiologist;

  @OneToOne(() => Feature, (feature) => feature.report)
  feature: Feature;

  @OneToOne(() => AiResult, (aiResult) => aiResult.report)
  aiResult: AiResult;

@OneToOne(() => CardioNlpResult, (cardioNlpResult) => cardioNlpResult.report)
cardioNlpResult: CardioNlpResult;
}