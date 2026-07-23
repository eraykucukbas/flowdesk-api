import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tenant } from '../../tenants/entities/tenant.entity';
import { RequestEvent } from './request-event.entity';

export enum RequestStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum RequestChannel {
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  WEB = 'WEB',
  CHAT = 'CHAT',
}

export enum RequestUrgency {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RequestSentiment {
  POSITIVE = 'POSITIVE',
  NEUTRAL = 'NEUTRAL',
  NEGATIVE = 'NEGATIVE',
}

@Entity('requests')
export class Request {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id' })
  tenantId!: string;

  @Column()
  title!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ type: 'enum', enum: RequestChannel })
  channel!: RequestChannel;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.OPEN })
  status!: RequestStatus;

  @Column({ nullable: true })
  category!: string | null;

  @Column({ type: 'enum', enum: RequestUrgency, nullable: true })
  urgency!: RequestUrgency | null;

  @Column({ type: 'enum', enum: RequestSentiment, nullable: true })
  sentiment!: RequestSentiment | null;

  @Column({ name: 'external_message_id', nullable: true, unique: true })
  externalMessageId!: string | null;

  @ManyToOne(() => Tenant, (tenant) => tenant.requests, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'tenant_id' })
  tenant!: Tenant;

  @OneToMany(() => RequestEvent, (event) => event.request, { cascade: true })
  events!: RequestEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;

  // --- State transition methods ---

  markInProgress(): void {
    if (this.status !== RequestStatus.OPEN) {
      throw new Error(
        `Cannot move to IN_PROGRESS from ${this.status}. Only OPEN requests can be started.`,
      );
    }
    this.status = RequestStatus.IN_PROGRESS;
  }

  markResolved(): void {
    if (
      this.status !== RequestStatus.OPEN &&
      this.status !== RequestStatus.IN_PROGRESS
    ) {
      throw new Error(
        `Cannot resolve from ${this.status}. Only OPEN or IN_PROGRESS requests can be resolved.`,
      );
    }
    this.status = RequestStatus.RESOLVED;
  }

  close(): void {
    if (this.status === RequestStatus.CLOSED) {
      throw new Error('Request is already closed.');
    }
    this.status = RequestStatus.CLOSED;
  }

  reopen(): void {
    if (
      this.status !== RequestStatus.RESOLVED &&
      this.status !== RequestStatus.CLOSED
    ) {
      throw new Error(
        `Cannot reopen from ${this.status}. Only RESOLVED or CLOSED requests can be reopened.`,
      );
    }
    this.status = RequestStatus.OPEN;
  }
}
