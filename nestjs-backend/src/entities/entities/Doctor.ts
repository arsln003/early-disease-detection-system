import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Assignment } from "./Assignment";

@Index("doctor_pkey", ["doctorid"], { unique: true })
@Index("doctor_email_key", ["email"], { unique: true })
@Entity("doctor", { schema: "public" })
export class Doctor {
  @PrimaryGeneratedColumn({ type: "integer", name: "doctorid" })
  doctorid: number;

  @Column("character varying", { name: "fullname", length: 100 })
  fullname: string;

  @Column("character varying", {
    name: "specialization",
    nullable: true,
    length: 100,
  })
  specialization: string | null;

  @Column("character varying", { name: "email", unique: true, length: 100 })
  email: string;

  @Column("character varying", { name: "password", length: 255 })
  password: string;

  @Column("integer", { name: "experience", nullable: true })
  experience: number | null;

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

@Column("character varying", {
  name: "fcmtoken",
  nullable: true,
  length: 255,
})
fcmtoken: string | null;

  @OneToMany(() => Assignment, (assignment) => assignment.doctor)
  assignments: Assignment[];
}
