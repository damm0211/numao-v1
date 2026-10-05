import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateMeetupDto } from './dto/create-meetup.dto';

@Injectable()
export class MeetupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getAuthorizedConnection(connectionId: string, userId: string) {
    const connection = await this.prisma.connection.findFirst({
      where: {
        id: connectionId,
        status: 'ACTIVE',
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        petA: { select: { id: true, name: true, ownerId: true } },
        petB: { select: { id: true, name: true, ownerId: true } },
        userA: { select: { id: true, displayName: true } },
        userB: { select: { id: true, displayName: true } },
      },
    });

    if (!connection) {
      throw new NotFoundException('Conexión no encontrada o no autorizada');
    }

    return connection;
  }

  private validateDates(startAt: Date, endAt?: Date) {
    if (Number.isNaN(startAt.getTime())) {
      throw new BadRequestException('La fecha y hora del encuentro no son válidas');
    }

    if (startAt.getTime() <= Date.now()) {
      throw new BadRequestException('El encuentro debe ser en el futuro');
    }

    if (endAt) {
      if (Number.isNaN(endAt.getTime())) {
        throw new BadRequestException('La hora de término no es válida');
      }

      if (endAt.getTime() <= startAt.getTime()) {
        throw new BadRequestException(
          'La hora de término debe ser posterior al inicio',
        );
      }
    }
  }

  async create(connectionId: string, userId: string, dto: CreateMeetupDto) {
    const connection = await this.getAuthorizedConnection(connectionId, userId);

    const startAt = new Date(dto.startAt);
    const endAt = dto.endAt ? new Date(dto.endAt) : undefined;
    this.validateDates(startAt, endAt);

    const placeName = dto.placeName.trim();
    if (!placeName) {
      throw new BadRequestException('El lugar es obligatorio');
    }

  let place: {
  id: string;
  name: string;
  address: string;
  latitude: Prisma.Decimal | null;
  longitude: Prisma.Decimal | null;
} | null = null;

    if (dto.petFriendlyPlaceId) {
      place = await this.prisma.petFriendlyPlace.findFirst({
        where: {
          id: dto.petFriendlyPlaceId,
          active: true,
        },
        select: {
          id: true,
          name: true,
          address: true,
          latitude: true,
          longitude: true,
        },
      });

      if (!place) {
        throw new NotFoundException('Lugar pet friendly no encontrado');
      }
    }

    const petAId = connection.petA.id;
    const petBId = connection.petB.id;
    const recipientUserId =
      connection.userAId === userId
        ? connection.userBId
        : connection.userAId;

    const meetup = await this.prisma.meetup.create({
      data: {
        connectionId,
        petAId,
        petBId,
        proposedByUserId: userId,
        startAt,
        endAt: endAt ?? null,
        placeName: place?.name ?? placeName,
        placeAddress: place?.address ?? dto.placeAddress?.trim() ?? null,
        latitude:
          place?.latitude ??
          (dto.latitude !== undefined ? dto.latitude : null),
        longitude:
          place?.longitude ??
          (dto.longitude !== undefined ? dto.longitude : null),
        petFriendlyPlaceId: place?.id ?? null,
      },
      include: {
        petA: { select: { id: true, name: true } },
        petB: { select: { id: true, name: true } },
        connection: { select: { id: true } },
        petFriendlyPlace: true,
      },
    });

    await this.notifications.createMeetupProposalNotification({
      recipientUserId,
      recipientPetId:
        connection.userAId === recipientUserId
          ? connection.petAId
          : connection.petBId,
      connectionId,
      meetupId: meetup.id,
      proposerPetName:
        connection.userAId === userId
          ? connection.petA.name
          : connection.petB.name,
    });

    return meetup;
  }

  async findMine(userId: string) {
    return this.prisma.meetup.findMany({
      where: {
        connection: {
          status: 'ACTIVE',
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      },
      include: {
        petA: { select: { id: true, name: true } },
        petB: { select: { id: true, name: true } },
        petFriendlyPlace: true,
        connection: { select: { id: true, status: true } },
      },
      orderBy: { startAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const meetup = await this.prisma.meetup.findFirst({
      where: {
        id,
        connection: {
          OR: [{ userAId: userId }, { userBId: userId }],
        },
      },
      include: {
        petA: { select: { id: true, name: true, photos: { orderBy: { sortOrder: 'asc' } } } },
        petB: { select: { id: true, name: true, photos: { orderBy: { sortOrder: 'asc' } } } },
        petFriendlyPlace: true,
        connection: {
          select: {
            id: true,
            status: true,
            userAId: true,
            userBId: true,
          },
        },
      },
    });

    if (!meetup) {
      throw new NotFoundException('Encuentro no encontrado');
    }

    return meetup;
  }

  async updateStatus(
    id: string,
    userId: string,
    status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED',
  ) {
    const meetup = await this.findOne(id, userId);

    if (status === 'COMPLETED') {
  if (meetup.status !== 'CONFIRMED') {
    throw new BadRequestException(
      'Solo se puede completar un encuentro confirmado',
    );
  }

  if (meetup.startAt.getTime() > Date.now()) {
    throw new BadRequestException(
      'El encuentro todavía no ha ocurrido',
    );
  }
}    

    if (status === 'COMPLETED' && meetup.status !== 'CONFIRMED') {
      throw new BadRequestException(
        'Solo se puede completar un encuentro confirmado',
      );
    }

    if (
      status === 'CONFIRMED' &&
      meetup.status !== 'PROPOSED'
    ) {
      throw new BadRequestException(
        'Solo se puede confirmar una propuesta pendiente',
      );
    }

    if (
      status === 'CANCELLED' &&
      meetup.status !== 'PROPOSED' &&
      meetup.status !== 'CONFIRMED'
    ) {
      throw new BadRequestException(
        'Este encuentro no puede cancelarse en su estado actual',
      );
    }

    const updated = await this.prisma.meetup.update({
      where: { id },
      data: { status },
      include: {
        petA: { select: { id: true, name: true } },
        petB: { select: { id: true, name: true } },
        petFriendlyPlace: true,
        connection: {
          select: {
            id: true,
            userAId: true,
            userBId: true,
          },
        },
      },
    });

    const recipientUserId =
      updated.connection.userAId === userId
        ? updated.connection.userBId
        : updated.connection.userAId;

    const recipientPetId =
      updated.connection.userAId === recipientUserId
        ? updated.petAId
        : updated.petBId;

    if (status === 'CONFIRMED') {
      await this.notifications.createMeetupConfirmedNotification({
        recipientUserId,
        recipientPetId,
        connectionId: updated.connectionId,
        meetupId: updated.id,
      });
    }

    if (status === 'CANCELLED') {
      await this.notifications.createMeetupCancelledNotification({
        recipientUserId,
        recipientPetId,
        connectionId: updated.connectionId,
        meetupId: updated.id,
      });
    }

    return updated;
  }
}
