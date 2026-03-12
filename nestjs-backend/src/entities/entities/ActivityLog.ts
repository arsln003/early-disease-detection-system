import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Index("activity_log_pkey", ["logid"], { unique: true })
@Entity("activity_log", { schema: "public" })
export class ActivityLog {
  @PrimaryGeneratedColumn({ type: "integer", name: "logid" })
  logid: number;

  @Column("character varying", { name: "usertype", nullable: true, length: 20 })
  usertype: string | null;

  @Column("integer", { name: "userid", nullable: true })
  userid: number | null;

  @Column("character varying", { name: "action", nullable: true, length: 255 })
  action: string | null;

  @Column("text", { name: "description", nullable: true })
  description: string | null;

  @Column("timestamp without time zone", {
    name: "timestamp",
    nullable: true,
    default: () => "CURRENT_TIMESTAMP",
  })
  timestamp: Date | null;
}
