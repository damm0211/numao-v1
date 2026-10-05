import { Controller, Get, Param } from '@nestjs/common';
import { PetFriendlyPlacesService } from './pet-friendly-places.service';

@Controller('pet-friendly-places')
export class PetFriendlyPlacesController {
  constructor(private readonly service: PetFriendlyPlacesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
