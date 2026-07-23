import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Request } from '../../requests/entities/request.entity';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  slug!: string;

  @OneToMany(() => User, (user) => user.tenant)
  users!: User[];

  @OneToMany(() => Request, (request) => request.tenant)
  requests!: Request[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' })
  deletedAt!: Date | null;

  @BeforeInsert()
  generateSlug() {
    if (!this.slug) {
      const map: Record<string, string> = {
        ğ: 'g',
        ü: 'u',
        ş: 's',
        ı: 'i',
        ö: 'o',
        ç: 'c',
      };
      this.slug = this.name
        .toLowerCase()
        .replace(/[ğüşıöç]/g, (c) => map[c])
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
    }
  }
}
