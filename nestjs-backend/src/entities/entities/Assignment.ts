import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Admin } from "./Admin";
import { Doctor } from "./Doctor";
import { Patient } from "./Patient";

@Index("assignment_pkey", ["assignmentid"], { unique: true })
@Entity("assignment", { schema: "public" })
export class Assignment {
  @PrimaryGeneratedColumn({ type: "integer", name: "assignmentid" })
  assignmentid: number;

  @Column("timestamp without time zone", {
    name: "assignedat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  assignedat: Date | null;

  @ManyToOne(() => Admin, (admin) => admin.assignments, {
    onDelete: "SET NULL",
  })
  @JoinColumn([{ name: "assignedby", referencedColumnName: "adminid" }])
  assignedby: Admin;

  @ManyToOne(() => Doctor, (doctor) => doctor.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "doctorid", referencedColumnName: "doctorid" }])
  doctor: Doctor;

  @ManyToOne(() => Patient, (patient) => patient.assignments, {
    onDelete: "CASCADE",
  })
  @JoinColumn([{ name: "patientid", referencedColumnName: "patientid" }])
  patient: Patient;
}
