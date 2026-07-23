import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Request } from './request.entity';

export enum RequestEventType {
  CREATED = 'CREATED',
  LLM_CLASSIFIED = 'LLM_CLASSIFIED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

@Entity('request_events')
export class RequestEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'request_id' })
  requestId!: string;

  @Column({ type: 'enum', enum: RequestEventType })
  type!: RequestEventType;

  @Column({ type: 'jsonb', default: {} })
  payload!: Record<string, unknown>;

  @ManyToOne(() => Request, (request) => request.events, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'request_id' })
  request!: Request;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
