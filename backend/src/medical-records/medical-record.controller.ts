import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
} from '@nestjs/common';

import { MedicalRecordService } from './medical-record.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';
import { UpdateMedicalRecordDto } from './dto/update-medical-record.dto';

@Controller('medical-records')
export class MedicalRecordController {
  constructor(private readonly service: MedicalRecordService) {}

  @Post()
  create(@Body() dto: CreateMedicalRecordDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get('patient/:id')
  async getByPatient(@Param('id') id: string) {
    const record = await this.service.findByPatient(id);

    if (!record) {
      return {
        record: null,
        message: 'No medical record found for this patient',
      };
    }

    return record;
  }

  @Get('doctor/:id/patients-count')
  countPatients(@Param('id') id: string) {
    return this.service.countPatientsForDoctor(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMedicalRecordDto) {
    return this.service.update(id, dto);
  }

  @Get('doctor/:doctorId/patients')
  async getPatientsForDoctor(@Param('doctorId') doctorId: string) {
    return this.service.getPatientsForDoctor(doctorId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
