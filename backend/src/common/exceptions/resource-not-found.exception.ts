import { NotFoundException } from '@nestjs/common';

export class ResourceNotFoundException extends NotFoundException {
  constructor(resource = 'Resource') {
    super(`${resource} not found`);
  }
}
