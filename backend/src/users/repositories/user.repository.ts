import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async create(userData: Partial<User>): Promise<User> {
    const user = this.repo.create(userData);
    return this.repo.save(user);
  }

  async update(id: string, userData: Partial<User>): Promise<User> {
    const user = await this.repo.preload({ id, ...userData });
    if (!user) throw new Error('User not found');
    return this.repo.save(user);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    if (result.affected === 0) throw new Error('User not found');
    return true;
  }

  async findAll(): Promise<User[]> {
    return this.repo.find({
      relations: ['roles', 'service'],
    });
  }

  async findByUsernameWithRoles(username: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.roles', 'roles')
      .where('user.username = :username', { username })
      .getOne();
  }

  async findOneById(id: string): Promise<User | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['roles', 'service'],
    });
  }
}
