import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { supabase } from '../supabase';
import { PETS_BUCKET } from '../storage';
import { randomUUID } from 'crypto';

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

  private getPublicUrl(storageKey: string) {
    if (
      storageKey.startsWith('http://') ||
      storageKey.startsWith('https://')
    ) {
      return storageKey;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from(PETS_BUCKET)
      .getPublicUrl(storageKey);

    return publicUrl;
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
      url: this.getPublicUrl(
        photo.storageKey,
      ),
    }));
  }

  async create(
    petId: string,
    userId: string,
    fileBuffer: Buffer,
    mimeType: string,
    extension: string,
  ) {
    await this.getOwnedPet(
      petId,
      userId,
    );

    if (!fileBuffer?.length) {
      throw new BadRequestException(
        'No se recibió la fotografía.',
      );
    }

    const safeExtension =
      extension &&
      extension.startsWith('.')
        ? extension
        : '.jpg';

    const storageKey =
      `pets/${randomUUID()}${safeExtension}`;

    const { error: uploadError } =
      await supabase.storage
        .from(PETS_BUCKET)
        .upload(
          storageKey,
          fileBuffer,
          {
            contentType: mimeType,
            upsert: false,
          },
        );

    if (uploadError) {
      throw new BadRequestException(
        `No se pudo guardar la fotografía: ${uploadError.message}`,
      );
    }

    try {
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
        url: this.getPublicUrl(
          photo.storageKey,
        ),
      };
    } catch (error) {
      await supabase.storage
        .from(PETS_BUCKET)
        .remove([storageKey]);

      throw error;
    }
  }

  async setPrimary(
    petId: string,
    photoId: string,
    userId: string,
  ) {
    await this.getOwnedPet(
      petId,
      userId,
    );

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

    return this.list(
      petId,
      userId,
    );
  }

  async remove(
    petId: string,
    photoId: string,
    userId: string,
  ) {
    await this.getOwnedPet(
      petId,
      userId,
    );

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

    const isSupabaseStorageKey =
      !photo.storageKey.startsWith(
        'http://',
      ) &&
      !photo.storageKey.startsWith(
        'https://',
      );

    if (isSupabaseStorageKey) {
      const { error: storageError } =
        await supabase.storage
          .from(PETS_BUCKET)
          .remove([
            photo.storageKey,
          ]);

      if (storageError) {
        throw new BadRequestException(
          `No se pudo eliminar la fotografía del almacenamiento: ${storageError.message}`,
        );
      }
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

    return this.list(
      petId,
      userId,
    );
  }
}