import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

export interface EmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendResult {
  sent: boolean;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly testRecipient: string | undefined;
  private readonly frontendUrl: string;

  constructor(private readonly mailer: MailerService) {
    const testRecipient = process.env.MAIL_TEST_RECIPIENT;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error('FRONTEND_URL is required.');
    }

    this.testRecipient = testRecipient || undefined;
    this.frontendUrl = frontendUrl;
  }

  private resolveTo(to: string): string {
    return this.testRecipient ?? to;
  }

  private appendOriginallyFor(html: string, originalTo: string): string {
    if (!this.testRecipient) {
      return html;
    }
    return `${html}\n<p>Originally for: ${originalTo}</p>`;
  }

  private appendOriginallyForText(text: string, originalTo: string): string {
    if (!this.testRecipient) {
      return text;
    }
    return `${text}\nOriginally for: ${originalTo}`;
  }

  async sendWelcomeEmail(
    to: string,
    fullName: string,
    loginEmail: string,
    password: string,
  ): Promise<SendResult> {
    const actualTo = this.resolveTo(to);
    const html = `
<h2>Welcome to HospitalHub</h2>
<p>Hello <b>${fullName}</b>,</p>
<p>Your account has been created. Here are your login credentials:</p>
<ul>
  <li>Email: ${loginEmail}</li>
  <li>Password: ${password}</li>
</ul>
<p>Please log in at <a href="${this.frontendUrl}">${this.frontendUrl}</a>.</p>
<p>We recommend you change your password after your first login.</p>
${this.testRecipient ? `<p>Originally for: ${to}</p>` : ''}
`;
    const text = `
Welcome to HospitalHub

Hello ${fullName},

Your account has been created. Here are your login credentials:

Email: ${loginEmail}
Password: ${password}

Please log in at ${this.frontendUrl}.

We recommend you change your password after your first login.
${this.testRecipient ? `Originally for: ${to}` : ''}
`;

    try {
      await this.mailer.sendMail({
        to: actualTo,
        subject: 'Your account is ready!',
        text,
        html,
      });
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send welcome email. ${message}`);
      return { sent: false };
    }
  }

  async sendEmail(email: EmailPayload): Promise<SendResult> {
    const actualTo = this.resolveTo(email.to);
    const html = email.html
      ? this.appendOriginallyFor(email.html, email.to)
      : undefined;
    const text = email.text
      ? this.appendOriginallyForText(email.text, email.to)
      : undefined;

    try {
      await this.mailer.sendMail({
        to: actualTo,
        subject: email.subject,
        text,
        html,
      });
      return { sent: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email. ${message}`);
      return { sent: false };
    }
  }
}
