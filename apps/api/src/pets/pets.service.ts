import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { UpdatePetPreferencesDto } from './dto/update-pet-preferences.dto';
import { CreatePetInterestDto } from './dto/create-pet-interest.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { supabase } from '../supabase';
import { PETS_BUCKET } from '../storage';

@Injectable()
export class PetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

    private getPublicPhotoUrl(
    storageKey: string,
  ) {
    if (
      storageKey.startsWith('http://') ||
      storageKey.startsWith('https://')
    ) {
      return storageKey;
    }

    const { data } =
      supabase.storage
        .from(PETS_BUCKET)
        .getPublicUrl(storageKey);

    return data.publicUrl;
  }
  async create(ownerId: string, dto: CreatePetDto) {
    const birthDate = new Date(dto.birthDate);

    if (Number.isNaN(birthDate.getTime())) {
      throw new BadRequestException(
        'Fecha de nacimiento inválida',
      );
    }

    const preferences = (dto as CreatePetDto & {
      preferences?: {
        play?: boolean;
        walk?: boolean;
        socialize?: boolean;
        reproduction?: boolean;
      };
    }).preferences;

    const enabledPreferences = [
      preferences?.play ? 'PLAY' : null,
      preferences?.walk ? 'WALK' : null,
      preferences?.socialize ? 'SOCIALIZE' : null,
      preferences?.reproduction ? 'REPRODUCTION' : null,
    ].filter(Boolean) as Array<
      'PLAY' | 'WALK' | 'SOCIALIZE' | 'REPRODUCTION'
    >;

    if (enabledPreferences.length === 0) {
      throw new BadRequestException(
        'Selecciona al menos una preferencia de conexión.',
      );
    }

    return this.prisma.pet.create({
      data: {
        ownerId,
        name: dto.name.trim(),
        birthDate,
        breed: dto.breed?.trim() || null,
        size: dto.size ?? null,
        energyLevel: dto.energyLevel ?? null,
        sociability: dto.sociability ?? null,
        playfulness: dto.playfulness ?? null,
        bio: dto.bio?.trim() || null,
        interests: {
          create: enabledPreferences.map((type) => ({
            type,
            enabled: true,
          })),
        },
      },
    });
  }

    async findByOwner(ownerId: string) {
    const pets = await this.prisma.pet.findMany({
      where: {
        ownerId,
        status: {
          in: ['ACTIVE', 'PAUSED'],
        },
      },
      include: {
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return pets.map((pet) => ({
      ...pet,
      photos: pet.photos.map((photo) => ({
        ...photo,
        url: this.getPublicPhotoUrl(
          photo.storageKey,
        ),
      })),
    }));
  }

  async getPublicProfile(id: string, viewerId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        status: 'ACTIVE',
      },
      include: {
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        interests: {
          where: {
            enabled: true,
          },
          select: {
            type: true,
            enabled: true,
          },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

    return {
      pet: {
        id: pet.id,
        name: pet.name,
        birthDate: pet.birthDate,
        breed: pet.breed,
        size: pet.size,
        energyLevel: pet.energyLevel,
        sociability: pet.sociability,
        playfulness: pet.playfulness,
        bio: pet.bio,
        status: pet.status,
      },

       photos: pet.photos.map((photo) => ({
  ...photo,
  url: this.getPublicPhotoUrl(
    photo.storageKey,
  ),
})),
      preferences: {
        play: pet.interests.some(
          (interest) => interest.type === 'PLAY' && interest.enabled,
        ),
        walk: pet.interests.some(
          (interest) => interest.type === 'WALK' && interest.enabled,
        ),
        socialize: pet.interests.some(
          (interest) => interest.type === 'SOCIALIZE' && interest.enabled,
        ),
        reproduction: pet.interests.some(
          (interest) => interest.type === 'REPRODUCTION' && interest.enabled,
        ),
      },
      isOwner: pet.ownerId === viewerId,
    };
  }

  async findOne(id: string, ownerId: string) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id,
        ownerId,
        status: {
          in: ['ACTIVE', 'PAUSED'],
        },
      },
      include: {
        photos: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

        return {
      ...pet,
      photos: pet.photos.map((photo) => ({
        ...photo,
        url: this.getPublicPhotoUrl(
          photo.storageKey,
        ),
      })),
    };
  }

  async update(
    id: string,
    ownerId: string,
    dto: UpdatePetDto,
  ) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
    });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

    if (pet.ownerId !== ownerId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta mascota',
      );
    }

    const data: {
      name?: string;
      birthDate?: Date;
      breed?: string | null;
      size?: string | null;
      energyLevel?: number | null;
      sociability?: number | null;
      playfulness?: number | null;
      bio?: string | null;
    } = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
    }

    if (dto.birthDate !== undefined) {
      const birthDate = new Date(dto.birthDate);

      if (Number.isNaN(birthDate.getTime())) {
        throw new BadRequestException(
          'Fecha de nacimiento inválida',
        );
      }

      data.birthDate = birthDate;
    }

    if (dto.breed !== undefined) {
      data.breed = dto.breed.trim() || null;
    }

    if (dto.size !== undefined) {
      data.size = dto.size;
    }

    if (dto.energyLevel !== undefined) {
      data.energyLevel = dto.energyLevel;
    }

    if (dto.sociability !== undefined) {
      data.sociability = dto.sociability;
    }

    if (dto.playfulness !== undefined) {
      data.playfulness = dto.playfulness;
    }

    if (dto.bio !== undefined) {
      data.bio = dto.bio.trim() || null;
    }

    return this.prisma.pet.update({
      where: { id },
      data,
    });
  }

  async setStatus(
    id: string,
    ownerId: string,
    status: 'ACTIVE' | 'PAUSED',
  ) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      select: { id: true, ownerId: true, status: true },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    if (pet.ownerId !== ownerId) {
      throw new ForbiddenException(
        'No tienes permiso para modificar esta mascota',
      );
    }

    return this.prisma.pet.update({
      where: { id },
      data: { status },
    });
  }

  async getPreferences(
    id: string,
    ownerId: string,
  ) {
    await this.findOne(id, ownerId);

    const preferences =
      await this.prisma.petPreference.findMany({
        where: {
          petId: id,
        },
      });

    return {
      play:
        preferences.find(
          (p) => p.type === 'PLAY',
        )?.enabled ?? false,

      walk:
        preferences.find(
          (p) => p.type === 'WALK',
        )?.enabled ?? false,

      socialize:
        preferences.find(
          (p) => p.type === 'SOCIALIZE',
        )?.enabled ?? false,

      reproduction:
        preferences.find(
          (p) => p.type === 'REPRODUCTION',
        )?.enabled ?? false,
    };
  }

  async updatePreferences(
    id: string,
    ownerId: string,
    dto: UpdatePetPreferencesDto,
  ) {
    await this.findOne(id, ownerId);

    const preferences = [
      {
        type: 'PLAY' as const,
        enabled: dto.play,
      },
      {
        type: 'WALK' as const,
        enabled: dto.walk,
      },
      {
        type: 'SOCIALIZE' as const,
        enabled: dto.socialize,
      },
      {
        type: 'REPRODUCTION' as const,
        enabled: dto.reproduction,
      },
    ];

    for (const preference of preferences) {
      if (preference.enabled !== undefined) {
        await this.prisma.petPreference.upsert({
          where: {
            petId_type: {
              petId: id,
              type: preference.type,
            },
          },
          update: {
            enabled: preference.enabled,
          },
          create: {
            petId: id,
            type: preference.type,
            enabled: preference.enabled,
          },
        });
      }
    }

    return this.getPreferences(id, ownerId);
  }

  async discover(ownerId: string, sourcePetId?: string) {
    const sourcePet = await this.prisma.pet.findFirst({
      where: {
        ownerId,
        status: 'ACTIVE',
        ...(sourcePetId ? { id: sourcePetId } : {}),
      },
      select: {
        id: true,
        name: true,
        interests: {
          where: {
            enabled: true,
          },
          select: {
            type: true,
          },
        },
      },
      ...(sourcePetId ? {} : { orderBy: { createdAt: 'asc' as const } }),
    });

    if (!sourcePet) {
      throw new NotFoundException(
        sourcePetId
          ? 'La mascota seleccionada no está activa o no pertenece a tu cuenta.'
          : 'No tienes una mascota activa para descubrir perfiles',
      );
    }

    const sourceInterestTypes =
      sourcePet.interests.map(
        (interest) => interest.type,
      );

    if (sourceInterestTypes.length === 0) {
      return [];
    }

    const pets =
      await this.prisma.pet.findMany({
        where: {
          status: 'ACTIVE',
          ownerId: {
            not: ownerId,
          },
          interests: {
            some: {
              enabled: true,
              type: {
                in: sourceInterestTypes,
              },
            },
          },
        },
        select: {
          id: true,
          name: true,
          birthDate: true,
          breed: true,
          size: true,
          energyLevel: true,
          sociability: true,
          playfulness: true,
          bio: true,
          status: true,
          photos: {
            orderBy: {
              sortOrder: 'asc',
            },
          },
          interests: {
            where: {
              enabled: true,
            },
            select: {
              type: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

    return pets.map((pet) => {
      const commonPreferences =
        pet.interests
          .map(
            (interest) => interest.type,
          )
          .filter((type) =>
            sourceInterestTypes.includes(type),
          );

      return {
        id: pet.id,
        name: pet.name,
        birthDate: pet.birthDate,
        breed: pet.breed,
        size: pet.size,
        energyLevel: pet.energyLevel,
        sociability: pet.sociability,
        playfulness: pet.playfulness,
        bio: pet.bio,
        status: pet.status,
        photos: pet.photos,
        preferences:
          pet.interests.map(
            (interest) => interest.type,
          ),
        commonPreferences,
      };
    });
  }

  /**
   * Calcula la compatibilidad v1 entre dos mascotas.
   *
   * Se comparan:
   * - energyLevel
   * - sociability
   * - playfulness
   *
   * Cada atributo entrega entre 0 y 100.
   * El resultado final es el promedio.
   *
   * Si un atributo está vacío en una de las mascotas,
   * simplemente no participa en el promedio.
   */
  private calculateCompatibility(
    fromPet: {
      energyLevel: number | null;
      sociability: number | null;
      playfulness: number | null;
    },
    toPet: {
      energyLevel: number | null;
      sociability: number | null;
      playfulness: number | null;
    },
  ): number {
    const scores: number[] = [];

    const addScore = (
      first: number | null,
      second: number | null,
    ) => {
      if (
        first === null ||
        second === null
      ) {
        return;
      }

      const difference = Math.abs(
        first - second,
      );

      const score = Math.max(
        0,
        100 - (difference / 4) * 100,
      );

      scores.push(score);
    };

    addScore(
      fromPet.energyLevel,
      toPet.energyLevel,
    );

    addScore(
      fromPet.sociability,
      toPet.sociability,
    );

    addScore(
      fromPet.playfulness,
      toPet.playfulness,
    );

    if (scores.length === 0) {
      return 0;
    }

    const average =
      scores.reduce(
        (sum, score) =>
          sum + score,
        0,
      ) / scores.length;

    return Math.round(average);
  }

  async getReceivedInterests(
    petId: string,
    ownerId: string,
  ) {
    const pet =
      await this.prisma.pet.findFirst({
        where: {
          id: petId,
          ownerId,
          status: 'ACTIVE',
        },
      });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

    const interests =
      await this.prisma.petInterest.findMany({
        where: {
          toPetId: petId,
          state: {
            in: [
              'PENDING',
              'MATCHED',
            ],
          },
        },
        include: {
          fromPet: {
            select: {
              id: true,
              name: true,
              breed: true,
              size: true,
              birthDate: true,
              bio: true,
              photos: {
                orderBy: {
                  sortOrder: 'asc',
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

    return interests.map(
      (interest) => ({
        id: interest.id,
        type: interest.type,
        state: interest.state,
        createdAt:
          interest.createdAt,
        fromPet:
          interest.fromPet,
      }),
    );
  }

  async createInterest(
    ownerId: string,
    fromPetId: string,
    dto: CreatePetInterestDto,
  ) {
    const fromPet =
      await this.prisma.pet.findFirst({
        where: {
          id: fromPetId,
          ownerId,
          status: 'ACTIVE',
        },
      });

    if (!fromPet) {
      throw new NotFoundException(
        'Mascota de origen no encontrada',
      );
    }

    if (fromPet.id === dto.toPetId) {
      throw new BadRequestException(
        'Una mascota no puede interesarse a sí misma',
      );
    }

    const toPet =
      await this.prisma.pet.findFirst({
        where: {
          id: dto.toPetId,
          status: 'ACTIVE',
        },
      });

    if (!toPet) {
      throw new NotFoundException(
        'Mascota de destino no encontrada',
      );
    }

    if (toPet.ownerId === ownerId) {
      throw new BadRequestException(
        'No puedes enviar interés a una mascota de tu propia cuenta',
      );
    }

    const existingInterest =
      await this.prisma.petInterest.findUnique({
        where: {
          fromPetId_toPetId_type: {
            fromPetId: fromPet.id,
            toPetId: toPet.id,
            type: dto.type,
          },
        },
      });

    /*
     * Un interés PENDING ya fue enviado anteriormente, por lo que
     * no generamos otra notificación por la misma acción.
     *
     * Si estaba REJECTED/BLOCKED, volver a interesarse sí representa
     * una nueva acción y puede generar una nueva notificación.
     */
    const shouldNotifyNewInterest =
      !existingInterest ||
      (existingInterest.state !== 'PENDING' &&
        existingInterest.state !== 'MATCHED');

    /*
     * Si el interés ya está MATCHED, no lo hacemos retroceder a
     * PENDING. Solo devolvemos la conexión activa existente.
     */
    if (existingInterest?.state === 'MATCHED') {
      const existingConnection =
        await this.prisma.connection.findFirst({
          where: {
            OR: [
              {
                petAId: fromPet.id,
                petBId: toPet.id,
              },
              {
                petAId: toPet.id,
                petBId: fromPet.id,
              },
            ],
            status: 'ACTIVE',
          },
        });

      if (existingConnection) {
        return {
          status: 'MATCHED',
          interest: existingInterest,
          reciprocalInterest: null,
          connection: existingConnection,
        };
      }
    }

    const interest =
      await this.prisma.petInterest.upsert({
        where: {
          fromPetId_toPetId_type: {
            fromPetId: fromPet.id,
            toPetId: toPet.id,
            type: dto.type,
          },
        },
        update: {
          state: 'PENDING',
        },
        create: {
          fromPetId: fromPet.id,
          toPetId: toPet.id,
          type: dto.type,
          state: 'PENDING',
        },
      });

    /*
     * Buscamos si la mascota destino ya había enviado
     * el mismo tipo de interés a la mascota de origen.
     */
    const reciprocalInterest =
      await this.prisma.petInterest.findUnique({
        where: {
          fromPetId_toPetId_type: {
            fromPetId: toPet.id,
            toPetId: fromPet.id,
            type: dto.type,
          },
        },
      });

    /*
     * Todavía no existe interés recíproco.
     * El interés queda PENDING.
     */
    if (!reciprocalInterest) {
      if (shouldNotifyNewInterest) {
        try {
          await this.notificationsService.createInterestNotification({
            recipientUserId: toPet.ownerId,
            recipientPetId: toPet.id,
            senderPetName: fromPet.name,
            interestType: dto.type,
          });
        } catch (notificationError) {
          console.error(
            'No fue posible crear la notificación de nuevo interés:',
            notificationError,
          );
        }
      }

      return {
        status: 'PENDING',
        interest,
        connection: null,
      };
    }

    /*
     * Ya existe interés en ambas direcciones.
     * Calculamos la compatibilidad y generamos MATCHED.
     */
    const compatibility =
      this.calculateCompatibility(
        fromPet,
        toPet,
      );

    const result =
      await this.prisma.$transaction(
        async (tx) => {
          const updatedFromInterest =
            await tx.petInterest.update({
              where: {
                id: interest.id,
              },
              data: {
                state: 'MATCHED',
              },
            });

          const updatedToInterest =
            await tx.petInterest.update({
              where: {
                id: reciprocalInterest.id,
              },
              data: {
                state: 'MATCHED',
              },
            });

          /*
           * Las mascotas pueden haber generado ya una Connection.
           * Solo consideramos NEW_CONNECTION si realmente creamos
           * una conexión nueva en esta operación.
           */
          let connection =
            await tx.connection.findFirst({
              where: {
                OR: [
                  {
                    petAId: fromPet.id,
                    petBId: toPet.id,
                  },
                  {
                    petAId: toPet.id,
                    petBId: fromPet.id,
                  },
                ],
                status: 'ACTIVE',
              },
            });

          let connectionCreated = false;

          if (!connection) {
            connection =
              await tx.connection.create({
                data: {
                  userAId: fromPet.ownerId,
                  userBId: toPet.ownerId,
                  petAId: fromPet.id,
                  petBId: toPet.id,
                  compatibility,
                  algorithmVersion: 'v1',
                  status: 'ACTIVE',
                },
              });

            connectionCreated = true;
          }

          return {
            updatedFromInterest,
            updatedToInterest,
            connection,
            connectionCreated,
          };
        },
      );

    /*
     * Las notificaciones se generan fuera de la transacción:
     * primero garantizamos que el Match/Connection quedó persistido.
     *
     * Si falla la notificación, no rompemos una conexión válida.
     */
    if (shouldNotifyNewInterest) {
      try {
        await this.notificationsService.createInterestNotification({
          recipientUserId: toPet.ownerId,
          recipientPetId: toPet.id,
          senderPetName: fromPet.name,
          interestType: dto.type,
        });
      } catch (notificationError) {
        console.error(
          'No fue posible crear la notificación de nuevo interés:',
          notificationError,
        );
      }
    }

    if (result.connectionCreated) {
      try {
        await Promise.all([
          this.notificationsService.createConnectionNotification({
            recipientUserId: fromPet.ownerId,
            recipientPetId: fromPet.id,
            connectionId: result.connection.id,
            otherPetName: toPet.name,
            compatibility: result.connection.compatibility,
          }),
          this.notificationsService.createConnectionNotification({
            recipientUserId: toPet.ownerId,
            recipientPetId: toPet.id,
            connectionId: result.connection.id,
            otherPetName: fromPet.name,
            compatibility: result.connection.compatibility,
          }),
        ]);
      } catch (notificationError) {
        console.error(
          'No fue posible crear las notificaciones de nueva conexión:',
          notificationError,
        );
      }
    }

    return {
      status: 'MATCHED',
      interest: result.updatedFromInterest,
      reciprocalInterest: result.updatedToInterest,
      connection: result.connection,
    };
  }
}
