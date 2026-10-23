import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from '../entities/patient.entity';

@Injectable()
export class PatientsRepository {
  constructor(
    @InjectRepository(Patient)
    private readonly repo: Repository<Patient>,
  ) {}

  async findAll(): Promise<Patient[]> {
    return this.repo.find({
      relations: ['services', 'createdBy'],
    });
  }

  async findByFullName(
    firstName: string,
    lastName: string,
  ): Promise<Patient | null> {
    return this.repo.findOne({
      where: [{ firstName, lastName }],
      relations: ['services', 'createdBy'],
    });
  }

  async findByFullNames(fullNames: string[]): Promise<Patient[]> {
    if (!fullNames.length) return [];

    const conditions = fullNames
      .map(
        (_, i) =>
          `LOWER(CONCAT(TRIM(patient.firstName), ' ', TRIM(patient.lastName))) ILIKE :name${i}`,
      )
      .join(' OR ');

    const params = Object.fromEntries(
      fullNames.map((name, i) => [`name${i}`, `%${name}%`]),
    );

    return this.repo
      .createQueryBuilder('patient')
      .where(conditions, params)
      .leftJoinAndSelect('patient.services', 'services')
      .leftJoinAndSelect('patient.createdBy', 'createdBy')
      .getMany();
  }

  async findByFirstName(firstName: string): Promise<Patient[]> {
    return this.repo
      .createQueryBuilder('patient')
      .where('LOWER(patient.firstName) = LOWER(:firstName)', { firstName })
      .orWhere(
        "LOWER(CONCAT(patient.firstName, ' ', patient.lastName)) = LOWER(:fullName)",
        {
          fullName: firstName,
        },
      )
      .leftJoinAndSelect('patient.services', 'services')
      .leftJoinAndSelect('patient.createdBy', 'createdBy')
      .getMany();
  }

  async findOneById(id: string): Promise<Patient | null> {
    return this.repo.findOne({
      where: { id },
      relations: ['services', 'createdBy'],
    });
  }
}
