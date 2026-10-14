import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/department.entity';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  async create(createServiceDto: CreateServiceDto): Promise<Service> {
    const { code, name, description } = createServiceDto;

    await this.ensureCodeAvailable(code);

    const service = this.serviceRepository.create({
      code,
      name,
      description,
    });

    return this.serviceRepository.save(service);
  }

  async findAll(): Promise<Service[]> {
    return this.serviceRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id },
    });
    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }
    return service;
  }

  async findByCode(code: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { code },
    });
    if (!service) {
      throw new NotFoundException(`Service with code '${code}' not found`);
    }
    return service;
  }

  async update(
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    const service = await this.findOne(id);
    const { code, name, description } = updateServiceDto;

    if (code && code !== service.code) {
      await this.ensureCodeAvailable(code);
      service.code = code;
    }

    if (name) service.name = name;
    if (description !== undefined) service.description = description;

    return this.serviceRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.findOne(id);
    await this.serviceRepository.remove(service);
  }

  async getServiceStatistics(id: string) {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ['users', 'patients'],
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${id} not found`);
    }

    return {
      service: service.name,
      totalDoctors: service.users?.length || 0,
      totalPatients: service.patients?.length || 0,
      totalMedicalRecords: 0,
    };
  }

  private async ensureCodeAvailable(code: string): Promise<void> {
    const existingService = await this.serviceRepository.findOne({
      where: { code },
    });
    if (existingService) {
      throw new ConflictException(`Service with code '${code}' already exists`);
    }
  }
}
