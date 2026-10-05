import { Module } from '@nestjs/common';

import { PetsController } from './pets.controller';
import { PetsService } from './pets.service';
import { PhotosController } from './photos.controller';
import { PhotosService } from './photos.service';

import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationsModule,
  ],
  controllers: [
    PetsController,
    PhotosController,
  ],
  providers: [
    PetsService,
    PhotosService,
  ],
})
export class PetsModule {}