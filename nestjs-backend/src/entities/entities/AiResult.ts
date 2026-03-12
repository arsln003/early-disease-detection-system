import {
  Column,
  Entity,
  Index,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Report } from "./Report";

@Index("ai_result_reportid_key", ["reportid"], { unique: true })
@Entity("ai_result", { schema: "public" })
export class AiResult {
  @PrimaryGeneratedColumn({ type: "integer", name: "airesultid" })
  airesultid: number;

  @Column("integer", { name: "reportid", unique: true })
  reportid: number;

  @Column("integer", { name: "prediction", nullable: true })
  prediction: number | null;

  @Column("float", { name: "probability", nullable: true })
  probability: number | null;

  @Column("character varying", {
    name: "classification",
    nullable: true,
    length: 20,
  })
  classification: string | null;

  @Column("text", { name: "keyparameters", nullable: true })
  keyparameters: string | null;

  @Column("text", { name: "remarks", nullable: true })
  remarks: string | null;

  @Column("character varying", {
    name: "modelname",
    nullable: true,
    length: 50,
  })
  modelname: string | null;

  @Column("timestamp without time zone", {
    name: "processedat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  processedat: Date | null;

  @OneToOne(() => Report, (report) => report.aiResult, { onDelete: "CASCADE" })
  @JoinColumn([{ name: "reportid", referencedColumnName: "reportid" }])
  report: Report;
}