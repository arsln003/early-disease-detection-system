import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Report } from "./Report";

@Index("cardio_nlp_result_pkey", ["cardionlpresultid"], { unique: true })
@Index("cardio_nlp_result_reportid_key", ["reportid"], { unique: true })
@Entity("cardio_nlp_result", { schema: "public" })
export class CardioNlpResult {
  @PrimaryGeneratedColumn({ type: "integer", name: "cardionlpresultid" })
  cardionlpresultid: number;

  @Column("integer", { name: "reportid", unique: true })
  reportid: number;

  @Column("text", { name: "clinical_summary", nullable: true })
  clinicalSummary: string | null;

  @Column("double precision", {
    name: "framingham_cvd_score",
    nullable: true,
  })
  framinghamCvdScore: number | null;

  @Column("character varying", {
    name: "cvd_risk_level",
    nullable: true,
    length: 30,
  })
  cvdRiskLevel: string | null;

  @Column("double precision", {
    name: "framingham_stroke_score",
    nullable: true,
  })
  framinghamStrokeScore: number | null;

  @Column("character varying", {
    name: "stroke_risk_level",
    nullable: true,
    length: 30,
  })
  strokeRiskLevel: string | null;

  @Column("jsonb", { name: "detected_diseases", nullable: true })
  detectedDiseases: string[] | null;

  @Column("jsonb", { name: "verified_results", nullable: true })
  verifiedResults: any[] | null;

  @Column("timestamp without time zone", {
    name: "processedat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  processedat: Date | null;

  @OneToOne(() => Report, (report) => report.cardioNlpResult, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "reportid", referencedColumnName: "reportid" }])
  report: Report;
}