import {
  ConnectedSocket,
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

interface JwtPayload {
  sub?: string;
  email?: string;
}

interface AuthenticatedSocket extends Socket {
  data: {
    userId?: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway
  implements OnGatewayConnection
{
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
  ) {}

  async handleConnection(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    const token =
      this.extractToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload =
        await this.jwtService.verifyAsync<JwtPayload>(
          token,
        );

      if (!payload.sub) {
        client.disconnect(true);
        return;
      }

      const userId = payload.sub;

      client.data.userId = userId;

      await client.join(
        this.getUserRoom(userId),
      );

      client.emit('realtime:ready', {
        userId,
      });
    } catch {
      client.disconnect(true);
    }
  }

  emitMessage(
    recipientUserId: string,
    message: unknown,
  ) {
    this.server
      .to(this.getUserRoom(recipientUserId))
      .emit('message:new', message);
  }

  emitNotification(
    recipientUserId: string,
    notification: unknown,
  ) {
    this.server
      .to(this.getUserRoom(recipientUserId))
      .emit(
        'notification:new',
        notification,
      );
  }

  private getUserRoom(
    userId: string,
  ) {
    return `user:${userId}`;
  }

  private extractToken(
    client: AuthenticatedSocket,
  ) {
    const authToken =
      client.handshake.auth?.token;

    if (
      typeof authToken === 'string' &&
      authToken.trim()
    ) {
      return authToken.trim();
    }

    const authorization =
      client.handshake.headers.authorization;

    if (
      typeof authorization === 'string' &&
      authorization.startsWith('Bearer ')
    ) {
      return authorization.substring(7).trim();
    }

    return null;
  }
}
