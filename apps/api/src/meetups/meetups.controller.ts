import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MeetupsService } from './meetups.service';
import { CreateMeetupDto } from './dto/create-meetup.dto';
import { UpdateMeetupStatusDto } from './dto/update-meetup-status.dto';

@Controller('meetups')
@UseGuards(JwtAuthGuard)
export class MeetupsController {
  constructor(private readonly service: MeetupsService) {}

  @Post('connections/:connectionId')
  create(
    @Param('connectionId') connectionId: string,
    @Req() request: any,
    @Body() dto: CreateMeetupDto,
  ) {
    return this.service.create(connectionId, request.user.id, dto);
  }

  @Get()
  findMine(@Req() request: any) {
    return this.service.findMine(request.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: any) {
    return this.service.findOne(id, request.user.id);
  }

  @Post(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Req() request: any,
    @Body() dto: UpdateMeetupStatusDto,
  ) {
    return this.service.updateStatus(
      id,
      request.user.id,
      dto.status,
    );
  }
}
