import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Assignment } from "./Assignment";
import { Patient } from "./Patient";

@Index("admin_pkey", ["adminid"], { unique: true })
@Index("admin_email_key", ["email"], { unique: true })
@Entity("admin", { schema: "public" })
export class Admin {
  @PrimaryGeneratedColumn({ type: "integer", name: "adminid" })
  adminid: number;

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
    name: "role",
    nullable: true,
    length: 20,
    default: () => "'Admin'",
  })
  role: string | null;

  @Column("timestamp without time zone", {
    name: "createdat",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  createdat: Date | null;

  @OneToMany(() => Assignment, (assignment) => assignment.assignedby)
  assignments: Assignment[];

  @OneToMany(() => Patient, (patient) => patient.createdby)
  patients: Patient[];
}
