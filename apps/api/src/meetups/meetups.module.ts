import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MeetupsController } from './meetups.controller';
import { MeetupsService } from './meetups.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [MeetupsController],
  providers: [MeetupsService],
})
export class MeetupsModule {}
