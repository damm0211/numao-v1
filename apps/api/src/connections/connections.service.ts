import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';

import {
  CreateMessageDto,
} from './dto/create-message.dto';

import {
  NotificationsService,
} from '../notifications/notifications.service';

import {
  supabase,
} from '../supabase';

import {
  PETS_BUCKET,
} from '../storage';

@Injectable()
export class ConnectionsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly notificationsService:
      NotificationsService,
  ) {}

  private readonly petSelect = {
    id: true,
    name: true,
    breed: true,
    size: true,
    birthDate: true,
    bio: true,
    energyLevel: true,
    sociability: true,
    playfulness: true,

    photos: {
      select: {
        id: true,
        storageKey: true,
        sortOrder: true,
      },

      orderBy: {
        sortOrder: 'asc' as const,
      },
    },
  };

  private getPublicPhotoUrl(
    storageKey: string,
  ) {
    if (
      storageKey.startsWith('http://') ||
      storageKey.startsWith('https://')
    ) {
      return storageKey;
    }

    const {
      data,
    } = supabase.storage
      .from(PETS_BUCKET)
      .getPublicUrl(storageKey);

    return data.publicUrl;
  }

  private mapPetPhotos<
    T extends {
      photos: Array<{
        id: string;
        storageKey: string;
        sortOrder: number;
      }>;
    },
  >(pet: T) {
    return {
      ...pet,

      photos: pet.photos.map(
        (photo) => ({
          ...photo,

          url:
            this.getPublicPhotoUrl(
              photo.storageKey,
            ),
        }),
      ),
    };
  }

  async findMine(userId: string) {
    const connections =
      await this.prisma.connection.findMany({
        where: {
          status: 'ACTIVE',

          OR: [
            {
              userAId: userId,
            },

            {
              userBId: userId,
            },
          ],
        },

        include: {
          petA: {
            select: this.petSelect,
          },

          petB: {
            select: this.petSelect,
          },
        },

        orderBy: {
          createdAt: 'desc',
        },
      });

    return Promise.all(
      connections.map(
        async (connection) => {
          const isUserA =
            connection.userAId === userId;

          const matchedIntentions =
            await this.getMatchedIntentions(
              connection.petA.id,
              connection.petB.id,
            );

          const petA =
            this.mapPetPhotos(
              connection.petA,
            );

          const petB =
            this.mapPetPhotos(
              connection.petB,
            );

          return {
            id: connection.id,

            status:
              connection.status,

            compatibility:
              connection.compatibility,

            algorithmVersion:
              connection.algorithmVersion,

            createdAt:
              connection.createdAt,

            currentPet: isUserA
              ? petA
              : petB,

            otherPet: isUserA
              ? petB
              : petA,

            matchedIntentions,
          };
        },
      ),
    );
  }

  async findOne(
    connectionId: string,
    userId: string,
  ) {
    const connection =
      await this.prisma.connection.findFirst({
        where: {
          id: connectionId,

          status: 'ACTIVE',

          OR: [
            {
              userAId: userId,
            },

            {
              userBId: userId,
            },
          ],
        },

        include: {
          petA: {
            select: this.petSelect,
          },

          petB: {
            select: this.petSelect,
          },
        },
      });

    if (!connection) {
      throw new NotFoundException(
        'Conexión no encontrada',
      );
    }

    const isUserA =
      connection.userAId === userId;

    const currentPet =
      isUserA
        ? connection.petA
        : connection.petB;

    const otherPet =
      isUserA
        ? connection.petB
        : connection.petA;

    const matchedIntentions =
      await this.getMatchedIntentions(
        connection.petA.id,
        connection.petB.id,
      );

    return {
      id: connection.id,

      status:
        connection.status,

      compatibility:
        connection.compatibility,

      algorithmVersion:
        connection.algorithmVersion,

      createdAt:
        connection.createdAt,

      currentPet:
        this.mapPetPhotos(
          currentPet,
        ),

      otherPet:
        this.mapPetPhotos(
          otherPet,
        ),

      matchedIntentions,
    };
  }

  private async getMatchedIntentions(
    petAId: string,
    petBId: string,
  ) {
    const interests =
      await this.prisma.petInterest.findMany({
        where: {
          state: 'MATCHED',

          OR: [
            {
              fromPetId: petAId,
              toPetId: petBId,
            },
            {
              fromPetId: petBId,
              toPetId: petAId,
            },
          ],
        },

        select: {
          type: true,
        },

        orderBy: {
          createdAt: 'asc',
        },
      });

    return [...new Set(interests.map((interest) => interest.type))];
  }

  private async getAuthorizedConnection(
    connectionId: string,
    userId: string,
  ) {
    const connection =
      await this.prisma.connection.findFirst({
        where: {
          id: connectionId,

          status: 'ACTIVE',

          OR: [
            {
              userAId: userId,
            },

            {
              userBId: userId,
            },
          ],
        },
      });

    if (!connection) {
      throw new NotFoundException(
        'Conexión no encontrada',
      );
    }

    return connection;
  }

  async findMessages(
    connectionId: string,
    userId: string,
  ) {
    await this.getAuthorizedConnection(
      connectionId,
      userId,
    );

    return this.prisma.message.findMany({
      where: {
        connectionId,
      },

      select: {
        id: true,

        connectionId: true,

        senderId: true,

        body: true,

        createdAt: true,

        sender: {
          select: {
            id: true,

            displayName: true,
          },
        },
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async createMessage(
    connectionId: string,
    userId: string,
    dto: CreateMessageDto,
  ) {
    const connection =
      await this.getAuthorizedConnection(
        connectionId,
        userId,
      );

    const body =
      dto.body.trim();

    if (!body) {
      throw new BadRequestException(
        'El mensaje no puede estar vacío',
      );
    }

    const isUserA =
      connection.userAId === userId;

    const senderPetId =
      isUserA
        ? connection.petAId
        : connection.petBId;

    const recipientUserId =
      isUserA
        ? connection.userBId
        : connection.userAId;

    const recipientPetId =
      isUserA
        ? connection.petBId
        : connection.petAId;

    const pets =
      await this.prisma.pet.findMany({
        where: {
          id: {
            in: [
              senderPetId,
              recipientPetId,
            ],
          },
        },

        select: {
          id: true,
          name: true,
        },
      });

    const senderPet =
      pets.find(
        (pet) =>
          pet.id === senderPetId,
      );

    const recipientPet =
      pets.find(
        (pet) =>
          pet.id === recipientPetId,
      );

    const message =
      await this.prisma.message.create({
        data: {
          connectionId,

          senderId: userId,

          body,
        },

        select: {
          id: true,

          connectionId: true,

          senderId: true,

          body: true,

          createdAt: true,

          sender: {
            select: {
              id: true,

              displayName: true,
            },
          },
        },
      });

    /*
     * La creación de la notificación no debe
     * impedir que el mensaje se entregue.
     *
     * Si por alguna razón el sistema de
     * notificaciones falla, el mensaje sigue
     * siendo válido y queda almacenado.
     */
    try {
      if (
        senderPet &&
        recipientPet
      ) {
        await this.notificationsService
          .createMessageNotification({
            recipientUserId,

            recipientPetId,

            connectionId,

            messageId:
              message.id,

            senderPetName:
              senderPet.name,

            recipientPetName:
              recipientPet.name,

            message,
          });
      }
    } catch (notificationError) {
      console.error(
        'No fue posible crear la notificación del mensaje:',
        notificationError,
      );
    }

    return message;
  }
}
