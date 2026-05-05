import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Assignment } from "./Assignment";
import { Admin } from "./Admin";
import { Report } from "./Report";
import { CadicaVideoReport } from './CadicaVideoReport';
@Index("patient_pkey", ["patientid"], { unique: true })
@Entity("patient", { schema: "public" })
export class Patient {
  @PrimaryGeneratedColumn({ type: "integer", name: "patientid" })
  patientid: number;

  @Column("character varying", { name: "fullname", length: 100 })
  fullname: string;

@Column("character varying", { name: "email", unique: true, length: 150 })
email: string;


  @Column("integer", { name: "age", nullable: true })
  age: number | null;

  @Column("character varying", { name: "gender", nullable: true, length: 10 })
  gender: string | null;

  @Column("character varying", {
    name: "contactnumber",
    nullable: true,
    length: 20,
  })
  contactnumber: string | null;

  @Column("character varying", { name: "address", nullable: true, length: 255 })
  address: string | null;

  @Column("timestamp without time zone", {
    name: "createdat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdat: Date | null;

  @OneToMany(() => Assignment, (assignment) => assignment.patient)
  assignments: Assignment[];

  @ManyToOne(() => Admin, (admin) => admin.patients, { onDelete: "SET NULL" })
  @JoinColumn([{ name: "createdby", referencedColumnName: "adminid" }])
  createdby: Admin;

  @OneToMany(() => Report, (report) => report.patient)
  reports: Report[];


  @OneToMany(() => CadicaVideoReport, (cadicaVideoReport) => cadicaVideoReport.patient)
  cadicaVideoReports: CadicaVideoReport[]; // Define this relation


}
