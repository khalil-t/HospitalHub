import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('MAIL_HOST');
        const port = configService.get<string>('MAIL_PORT');
        const user = configService.get<string>('MAIL_USER');
        const pass = configService.get<string>('MAIL_PASS');
        const from = configService.get<string>('MAIL_FROM');

        if (!host || !port || !user || !pass || !from) {
          throw new Error(
            'MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS and MAIL_FROM are required.',
          );
        }

        const secure = configService.get<string>('MAIL_SECURE') === 'true';

        return {
          transport: {
            host,
            port: Number(port),
            secure,
            auth: { user, pass },
          },
          defaults: {
            from,
          },
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class AppMailerModule {}
