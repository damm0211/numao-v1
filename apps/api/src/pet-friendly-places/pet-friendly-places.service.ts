import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PetFriendlyPlacesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.petFriendlyPlace.findMany({
      where: { active: true },
      orderBy: [
        { verified: 'desc' },
        { commune: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  async findOne(id: string) {
    const place = await this.prisma.petFriendlyPlace.findFirst({
      where: { id, active: true },
    });

    if (!place) {
      throw new NotFoundException('Lugar pet friendly no encontrado');
    }

    return place;
  }
}
