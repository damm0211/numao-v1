import {
  Module,
} from '@nestjs/common';

import {
  ConnectionsController,
} from './connections.controller';

import {
  ConnectionsService,
} from './connections.service';

import {
  PrismaModule,
} from '../prisma/prisma.module';

import {
  AuthModule,
} from '../auth/auth.module';

import {
  NotificationsModule,
} from '../notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    NotificationsModule,
  ],

  controllers: [
    ConnectionsController,
  ],

  providers: [
    ConnectionsService,
  ],
})
export class ConnectionsModule {}