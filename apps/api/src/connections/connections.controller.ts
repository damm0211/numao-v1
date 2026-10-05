import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ConnectionsService } from './connections.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateMessageDto } from './dto/create-message.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('connections')
@UseGuards(JwtAuthGuard)
export class ConnectionsController {
  constructor(
    private readonly connectionsService: ConnectionsService,
  ) {}

  @Get()
  async findMine(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.connectionsService.findMine(
      request.user.id,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.connectionsService.findOne(
      id,
      request.user.id,
    );
  }

  @Get(':id/messages')
  async findMessages(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.connectionsService.findMessages(
      id,
      request.user.id,
    );
  }

  @Post(':id/messages')
  async createMessage(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateMessageDto,
  ) {
    return this.connectionsService.createMessage(
      id,
      request.user.id,
      dto,
    );
  }
}