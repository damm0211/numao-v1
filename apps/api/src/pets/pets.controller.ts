import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Query,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { UpdatePetPreferencesDto } from './dto/update-pet-preferences.dto';
import { CreatePetInterestDto } from './dto/create-pet-interest.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetsController {
  constructor(
    private readonly petsService: PetsService,
  ) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePetDto,
  ) {
    return this.petsService.create(
      request.user.id,
      dto,
    );
  }

  @Get()
  async findMine(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.petsService.findByOwner(
      request.user.id,
    );
  }

  @Get('discover')
  async discover(
  @Req() request: AuthenticatedRequest,
  @Query('sourcePetId') sourcePetId?: string,
  @Query('targetPetId') targetPetId?: string,
) {
  return this.petsService.discover(
    request.user.id,
    sourcePetId,
    targetPetId,
  );
}  

  @Get(':id/interests/received')
  async getReceivedInterests(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.petsService.getReceivedInterests(
      id,
      request.user.id,
    );
  }

  @Get(':id/public-profile')
  async getPublicProfile(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.petsService.getPublicProfile(
      id,
      request.user.id,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.petsService.findOne(
      id,
      request.user.id,
    );
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdatePetDto,
  ) {
    return this.petsService.update(
      id,
      request.user.id,
      dto,
    );
  }

  @Patch(':id/status')
  async setStatus(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() body: { status?: string },
  ) {
    if (body.status !== 'ACTIVE' && body.status !== 'PAUSED') {
      throw new BadRequestException(
        'El estado debe ser ACTIVE o PAUSED.',
      );
    }

    return this.petsService.setStatus(
      id,
      request.user.id,
      body.status,
    );
  }

  @Get(':id/preferences')
  async getPreferences(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.petsService.getPreferences(
      id,
      request.user.id,
    );
  }

  @Patch(':id/preferences')
  async updatePreferences(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdatePetPreferencesDto,
  ) {
    return this.petsService.updatePreferences(
      id,
      request.user.id,
      dto,
    );
  }

  @Post(':id/interests')
  async createInterest(
    @Param('id') id: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreatePetInterestDto,
  ) {
    return this.petsService.createInterest(
      request.user.id,
      id,
      dto,
    );
  }
}
