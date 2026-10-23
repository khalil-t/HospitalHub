import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

@Injectable()
export class EmailService {
  constructor(private readonly mailer: MailerService) {}

  async sendEmail(email: EmailPayload) {
    try {
      await this.mailer.sendMail({
        to: email.to,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      return { message: 'Email sent successfully' };
    } catch {
      throw new Error('Email sending failed.');
    }
  }
}
