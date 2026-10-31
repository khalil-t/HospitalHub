import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { EmailService } from './email.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

interface SendEmailBody {
  to?: string;
  subject?: string;
  text?: string;
  html?: string;
}

@Roles(UserRole.SUPER_ADMIN)
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}

  @Post('send')
  async sendEmail(@Body() body: SendEmailBody) {
    const { to, subject, text, html } = body;

    if (!to || !subject || (!text && !html)) {
      throw new HttpException(
        'Fields "to", "subject", and "text OR html" are required.',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      return await this.emailService.sendEmail({ to, subject, text, html });
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to send email.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
