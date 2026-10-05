import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PetFriendlyPlacesController } from './pet-friendly-places.controller';
import { PetFriendlyPlacesService } from './pet-friendly-places.service';

@Module({
  imports: [PrismaModule],
  controllers: [PetFriendlyPlacesController],
  providers: [PetFriendlyPlacesService],
  exports: [PetFriendlyPlacesService],
})
export class PetFriendlyPlacesModule {}
