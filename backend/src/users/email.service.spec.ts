import { Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let mailerService: jest.Mocked<MailerService>;
  let service: EmailService;

  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.FRONTEND_URL = 'http://localhost:5173';
    delete process.env.MAIL_TEST_RECIPIENT;

    mailerService = {
      sendMail: jest.fn(),
    } as unknown as jest.Mocked<MailerService>;

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = new EmailService(mailerService);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('includes login email and password in welcome email body', async () => {
    mailerService.sendMail.mockResolvedValue(undefined);

    await service.sendWelcomeEmail(
      'user@example.com',
      'John Doe',
      'user@example.com',
      'secretPassword123',
    );

    const call = mailerService.sendMail.mock.calls[0][0];
    expect(call.to).toBe('user@example.com');
    expect(call.html).toContain('user@example.com');
    expect(call.html).toContain('secretPassword123');
    expect(call.text).toContain('user@example.com');
    expect(call.text).toContain('secretPassword123');
    expect(call.subject).toBe('Your account is ready!');
  });

  it('includes frontend URL and password change reminder in welcome email', async () => {
    mailerService.sendMail.mockResolvedValue(undefined);

    await service.sendWelcomeEmail(
      'user@example.com',
      'John Doe',
      'user@example.com',
      'secretPassword123',
    );

    const call = mailerService.sendMail.mock.calls[0][0];
    expect(call.html).toContain('http://localhost:5173');
    expect(call.html).toContain('change your password after your first login');
    expect(call.text).toContain('http://localhost:5173');
    expect(call.text).toContain('change your password after your first login');
  });

  it('redirects to MAIL_TEST_RECIPIENT and adds Originally for line', async () => {
    process.env.MAIL_TEST_RECIPIENT = 'test-trap@example.invalid';

    const svc = new EmailService(mailerService);
    mailerService.sendMail.mockResolvedValue(undefined);

    await svc.sendWelcomeEmail(
      'real-user@example.com',
      'John Doe',
      'real-user@example.com',
      'secretPassword123',
    );

    const call = mailerService.sendMail.mock.calls[0][0];
    expect(call.to).toBe('test-trap@example.invalid');
    expect(call.html).toContain('Originally for: real-user@example.com');
    expect(call.text).toContain('Originally for: real-user@example.com');
  });

  it('redirects generic email to MAIL_TEST_RECIPIENT', async () => {
    process.env.MAIL_TEST_RECIPIENT = 'test-trap@example.invalid';

    const svc = new EmailService(mailerService);
    mailerService.sendMail.mockResolvedValue(undefined);

    await svc.sendEmail({
      to: 'real-user@example.com',
      subject: 'Test',
      text: 'Hello',
      html: '<p>Hello</p>',
    });

    const call = mailerService.sendMail.mock.calls[0][0];
    expect(call.to).toBe('test-trap@example.invalid');
    expect(call.html).toContain('Originally for: real-user@example.com');
    expect(call.text).toContain('Originally for: real-user@example.com');
  });

  it('throws when FRONTEND_URL is missing', () => {
    delete process.env.FRONTEND_URL;

    expect(() => new EmailService(mailerService)).toThrow(
      'FRONTEND_URL is required.',
    );
  });

  it('does not throw when sendMail fails and returns sent false', async () => {
    mailerService.sendMail.mockRejectedValue(
      new Error('SMTP connection failed'),
    );

    const result = await service.sendWelcomeEmail(
      'user@example.com',
      'John Doe',
      'user@example.com',
      'secretPassword123',
    );

    expect(result).toEqual({ sent: false });
  });

  it('does not log password in error output when send fails', async () => {
    const errorSpy = jest.spyOn(Logger.prototype, 'error');
    mailerService.sendMail.mockRejectedValue(
      new Error('SMTP connection failed'),
    );

    await service.sendWelcomeEmail(
      'user@example.com',
      'John Doe',
      'user@example.com',
      'secretPassword123',
    );

    const loggedMessages = errorSpy.mock.calls.map((args) => args.join(' '));
    const passwordLogged = loggedMessages.some((msg) =>
      msg.includes('secretPassword123'),
    );
    const emailLogged = loggedMessages.some((msg) =>
      msg.includes('user@example.com'),
    );
    expect(passwordLogged).toBe(false);
    expect(emailLogged).toBe(false);
  });

  it('generic email send failure returns sent false without throwing', async () => {
    mailerService.sendMail.mockRejectedValue(
      new Error('SMTP connection failed'),
    );

    const result = await service.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      text: 'Hello',
    });

    expect(result).toEqual({ sent: false });
  });
});
