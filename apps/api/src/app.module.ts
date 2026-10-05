import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { PetsModule } from './pets/pets.module';
import { ConnectionsModule } from './connections/connections.module';
import { MeetupsModule } from './meetups/meetups.module';
import { PetFriendlyPlacesModule } from './pet-friendly-places/pet-friendly-places.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    PetsModule,
    ConnectionsModule,
    MeetupsModule,
    PetFriendlyPlacesModule,
    ReviewsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
