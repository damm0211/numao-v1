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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
  ) {}
  @Get('meetups/:meetupId')
  async hasReviewed(
    @Param('meetupId') meetupId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.reviewsService.hasReviewed(
      meetupId,
      request.user.id,
    );
  }


  @Post('meetups/:meetupId')
  async create(
    @Param('meetupId') meetupId: string,
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(
      meetupId,
      request.user.id,
      dto,
    );
  }
}