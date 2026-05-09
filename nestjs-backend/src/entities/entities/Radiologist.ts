import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Report } from "./Report";
import { StrokeReport } from './StrokeReport';
@Index("radiologist_email_key", ["email"], { unique: true })
@Index("radiologist_pkey", ["radiologistid"], { unique: true })
@Entity("radiologist", { schema: "public" })
export class Radiologist {
  @PrimaryGeneratedColumn({ type: "integer", name: "radiologistid" })
  radiologistid: number;

  @Column("character varying", { name: "fullname", length: 100 })
  fullname: string;

  @Column("character varying", { name: "email", unique: true, length: 100 })
  email: string;

  @Column("character varying", { name: "password", length: 255 })
  password: string;

  @Column("character varying", {
    name: "contactnumber",
    nullable: true,
    length: 20,
  })
  contactnumber: string | null;

  @Column("character varying", {
    name: "status",
    nullable: true,
    length: 20,
    default: () => "'Active'",
  })
  status: string | null;

  @Column("timestamp without time zone", {
    name: "createdat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdat: Date | null;

  @OneToMany(() => Report, (report) => report.radiologist)
  reports: Report[];

  @OneToMany(() => StrokeReport, (strokeReport) => strokeReport.radiologist)
  strokeReports: StrokeReport[];
}
