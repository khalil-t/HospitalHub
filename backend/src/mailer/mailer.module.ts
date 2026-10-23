import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const user = configService.get<string>('MAIL_USER');
        const pass = configService.get<string>('MAIL_PASS');

        if (!user || !pass) {
          throw new Error('MAIL_USER and MAIL_PASS are not set.');
        }

        return {
          transport: {
            host: configService.get<string>('MAIL_HOST', 'smtp.gmail.com'),
            port: Number(configService.get<string>('MAIL_PORT', '587')),
            secure: configService.get<string>('MAIL_SECURE') === 'true',
            auth: { user, pass },
          },
          defaults: {
            from: configService.get<string>(
              'MAIL_FROM',
              'no-reply@hospitalhub.local',
            ),
          },
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class AppMailerModule {}
