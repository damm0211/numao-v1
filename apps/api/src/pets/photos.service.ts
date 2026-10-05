import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PhotosService {
  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedPet(
    petId: string,
    userId: string,
  ) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: petId,
        ownerId: userId,
      },
      select: {
        id: true,
      },
    });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada.',
      );
    }

    return pet;
  }

  async list(
    petId: string,
    userId: string,
  ) {
    await this.getOwnedPet(petId, userId);

    const photos =
      await this.prisma.petPhoto.findMany({
        where: {
          petId,
        },
        orderBy: [
          {
            sortOrder: 'asc',
          },
          {
            createdAt: 'asc',
          },
        ],
      });

    return photos.map((photo) => ({
      id: photo.id,
      petId: photo.petId,
      storageKey: photo.storageKey,
      sortOrder: photo.sortOrder,
      createdAt: photo.createdAt,
      url: `/uploads/${photo.storageKey}`,
    }));
  }

  async create(
    petId: string,
    userId: string,
    storageKey: string,
  ) {
    await this.getOwnedPet(petId, userId);

    if (!storageKey) {
      throw new BadRequestException(
        'No se recibió la fotografía.',
      );
    }

    const existingCount =
      await this.prisma.petPhoto.count({
        where: {
          petId,
        },
      });

    const photo =
      await this.prisma.petPhoto.create({
        data: {
          petId,
          storageKey,
          sortOrder: existingCount,
        },
      });

    return {
      id: photo.id,
      petId: photo.petId,
      storageKey: photo.storageKey,
      sortOrder: photo.sortOrder,
      createdAt: photo.createdAt,
      url: `/uploads/${photo.storageKey}`,
    };
  }

  async setPrimary(
    petId: string,
    photoId: string,
    userId: string,
  ) {
    await this.getOwnedPet(petId, userId);

    const photo =
      await this.prisma.petPhoto.findFirst({
        where: {
          id: photoId,
          petId,
        },
      });

    if (!photo) {
      throw new NotFoundException(
        'Fotografía no encontrada.',
      );
    }

    const photos =
      await this.prisma.petPhoto.findMany({
        where: {
          petId,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

    await this.prisma.$transaction(
      photos.map((item, index) =>
        this.prisma.petPhoto.update({
          where: {
            id: item.id,
          },
          data: {
            sortOrder:
              item.id === photoId
                ? 0
                : index + 1,
          },
        }),
      ),
    );

    return this.list(petId, userId);
  }

  async remove(
    petId: string,
    photoId: string,
    userId: string,
  ) {
    await this.getOwnedPet(petId, userId);

    const photo =
      await this.prisma.petPhoto.findFirst({
        where: {
          id: photoId,
          petId,
        },
      });

    if (!photo) {
      throw new NotFoundException(
        'Fotografía no encontrada.',
      );
    }

    await this.prisma.petPhoto.delete({
      where: {
        id: photoId,
      },
    });

    const remaining =
      await this.prisma.petPhoto.findMany({
        where: {
          petId,
        },
        orderBy: {
          sortOrder: 'asc',
        },
      });

    if (remaining.length > 0) {
      await this.prisma.$transaction(
        remaining.map((item, index) =>
          this.prisma.petPhoto.update({
            where: {
              id: item.id,
            },
            data: {
              sortOrder: index,
            },
          }),
        ),
      );
    }

    return this.list(petId, userId);
  }
}