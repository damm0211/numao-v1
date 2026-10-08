import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway:
      NotificationsGateway,
  ) {}

  async findMine(userId: string) {
    const [items, unreadCount] =
      await Promise.all([
        this.prisma.notification.findMany({
          where: { userId },

          select: {
            id: true,
            type: true,
            title: true,
            body: true,
            petId: true,
            connectionId: true,
            messageId: true,
            readAt: true,
            createdAt: true,

            pet: {
              select: {
                id: true,
                name: true,
              },
            },

            connection: {
              select: {
                id: true,
                status: true,
              },
            },
          },

          orderBy: {
            createdAt: 'desc',
          },

          take: 50,
        }),

        this.prisma.notification.count({
          where: {
            userId,
            readAt: null,
          },
        }),
      ]);

    return {
      items,
      unreadCount,
    };
  }

  async markRead(
    notificationId: string,
    userId: string,
  ) {
    const readAt = new Date();

    const result =
      await this.prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId,
          readAt: null,
        },

        data: {
          readAt,
        },
      });

    if (result.count === 0) {
      throw new NotFoundException(
        'Notificación no encontrada',
      );
    }

    return {
      success: true,
      id: notificationId,
      readAt,
    };
  }

  async markAllRead(userId: string) {
    const result =
      await this.prisma.notification.updateMany({
        where: {
          userId,
          readAt: null,
        },

        data: {
          readAt: new Date(),
        },
      });

    return {
      success: true,
      updated: result.count,
    };
  }

  async createMessageNotification(params: {
    recipientUserId: string;
    recipientPetId: string;
    connectionId: string;
    messageId: string;
    senderPetName: string;
    recipientPetName: string;
    message: unknown;
  }) {
    const {
      recipientUserId,
      recipientPetId,
      connectionId,
      messageId,
      senderPetName,
      message,
    } = params;

    const notification =
      await this.prisma.notification.create({
        data: {
          userId: recipientUserId,
          petId: recipientPetId,
          connectionId,
          messageId,
          type: 'NEW_MESSAGE',
          title: 'Nuevo mensaje',
          body: `${senderPetName} te envió un mensaje.`,
        },

        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          petId: true,
          connectionId: true,
          messageId: true,
          readAt: true,
          createdAt: true,
        },
      });

    /*
     * La persistencia sigue siendo la fuente de verdad.
     * Socket.IO solamente entrega el evento en tiempo real.
     *
     * Si el usuario no está conectado, la notificación y
     * el mensaje siguen almacenados y se recuperan por REST.
     */
    try {
      this.notificationsGateway.emitMessage(
        recipientUserId,
        message,
      );

      this.notificationsGateway.emitNotification(
        recipientUserId,
        notification,
      );
    } catch (realtimeError) {
      console.error(
        'No fue posible emitir el evento realtime:',
        realtimeError,
      );
    }

    /*
     * Este punto queda preparado para incorporar futuros
     * canales de notificación, por ejemplo:
     *
     * - email
     * - push notification
     * - otros canales
     *
     * sin modificar ConnectionsController ni el frontend.
     */

    return notification;
  }
  async createInterestNotification(params: {
  recipientUserId: string;
  recipientPetId: string;
  senderPetName: string;
  interestType: string;
  }) {
    const {
      recipientUserId,
      recipientPetId,
      senderPetName,
      interestType,
    } = params;

    const notification =
      await this.prisma.notification.create({
        data: {
          userId: recipientUserId,
          petId: recipientPetId,
          type: 'NEW_INTEREST',
          title: 'Nuevo interés',
          body: `${senderPetName} mostró interés en tu mascota.`,
        },

        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          petId: true,
          connectionId: true,
          messageId: true,
          readAt: true,
          createdAt: true,
        },
      });

    try {
      this.notificationsGateway.emitNotification(
        recipientUserId,
        notification,
      );
    } catch (realtimeError) {
      console.error(
        'No fue posible emitir el evento realtime:',
        realtimeError,
      );
    }

    return notification;
  }

  async createConnectionNotification(params: {
    recipientUserId: string;
    recipientPetId: string;
    connectionId: string;
    otherPetName: string;
    compatibility: number;
  }) {
    const {
      recipientUserId,
      recipientPetId,
      connectionId,
      otherPetName,
      compatibility,
    } = params;

    /*
     * Una conexión concreta solo debe generar una notificación
     * NEW_CONNECTION por usuario. Esto hace el método idempotente
     * y evita duplicados si el flujo de Match vuelve a ejecutarse.
     */
    const existingNotification =
      await this.prisma.notification.findFirst({
        where: {
          userId: recipientUserId,
          connectionId,
          type: 'NEW_CONNECTION',
        },

        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          petId: true,
          connectionId: true,
          messageId: true,
          readAt: true,
          createdAt: true,
        },
      });

    if (existingNotification) {
      return existingNotification;
    }

    const notification =
      await this.prisma.notification.create({
        data: {
          userId: recipientUserId,
          petId: recipientPetId,
          connectionId,
          type: 'NEW_CONNECTION',
          title: 'Nueva conexión',
          body: `¡Tienes una nueva conexión con ${otherPetName}! Compatibilidad ${compatibility}%.`,
        },

        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          petId: true,
          connectionId: true,
          messageId: true,
          readAt: true,
          createdAt: true,
        },
      });

    try {
      this.notificationsGateway.emitNotification(
        recipientUserId,
        notification,
      );
    } catch (realtimeError) {
      console.error(
        'No fue posible emitir el evento realtime:',
        realtimeError,
      );
    }

    return notification;
  }

  async createMeetupProposalNotification(params: {
    recipientUserId: string;
    recipientPetId: string;
    connectionId: string;
    meetupId: string;
    proposerPetName: string;
  }) {
    const notification =
      await this.prisma.notification.create({
        data: {
          userId: params.recipientUserId,
          petId: params.recipientPetId,
          connectionId: params.connectionId,
          type: 'MEETING_PROPOSAL',
          title: 'Nueva propuesta de encuentro',
          body: `${params.proposerPetName} tiene una propuesta de encuentro para ustedes.`,
        },
      });

    const meetup =
      await this.prisma.meetup.findUnique({
        where: {
          id: params.meetupId,
        },
        include: {
          petA: {
            select: {
              id: true,
              name: true,
            },
          },
          petB: {
            select: {
              id: true,
              name: true,
            },
          },
          petFriendlyPlace: true,
        },
      });

    try {
      this.notificationsGateway.emitNotification(
        params.recipientUserId,
        {
          ...notification,
          meetupId: params.meetupId,
          meetup,
        },
      );
    } catch (realtimeError) {
      console.error(
        'No fue posible emitir el evento realtime:',
        realtimeError,
      );
    }

    return notification;
  }

  async createMeetupConfirmedNotification(params: {
    recipientUserId: string;
    recipientPetId: string;
    connectionId: string;
    meetupId: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.recipientUserId,
        petId: params.recipientPetId,
        connectionId: params.connectionId,
        type: 'MEETING_CONFIRMED',
        title: 'Encuentro confirmado',
        body: 'La propuesta de encuentro fue confirmada.',
      },
    });

    try {
    this.notificationsGateway.emitNotification(
  params.recipientUserId,
  {
    ...notification,
    meetupId: params.meetupId,
  },
);
    } catch {
      // La notificación persistida es la fuente de verdad.
    }

    return notification;
  }

  async createMeetupCancelledNotification(params: {
    recipientUserId: string;
    recipientPetId: string;
    connectionId: string;
    meetupId: string;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.recipientUserId,
        petId: params.recipientPetId,
        connectionId: params.connectionId,
        type: 'MEETING_CANCELLED',
        title: 'Encuentro cancelado',
        body: 'El encuentro fue cancelado.',
      },
    });

    try {
      this.notificationsGateway.emitNotification(
  params.recipientUserId,
  {
    ...notification,
    meetupId: params.meetupId,
  },
);
    } catch {
      // La notificación persistida es la fuente de verdad.
    }

    return notification;
  }
}
