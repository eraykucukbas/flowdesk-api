import { User } from './entities/user.entity';

export interface IUserRepository {
  create(data: Partial<User>): User;
  save(user: User): Promise<User>;
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
}

export const USER_REPOSITORY = Symbol('IUserRepository');
