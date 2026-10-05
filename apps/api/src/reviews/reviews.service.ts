import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(
    meetupId: string,
    reviewerId: string,
    dto: CreateReviewDto,
  ) {
    const meetup = await this.prisma.meetup.findFirst({
      where: {
        id: meetupId,
        connection: {
          OR: [
            { userAId: reviewerId },
            { userBId: reviewerId },
          ],
        },
      },
      select: {
        id: true,
        status: true,
        startAt: true,
        connection: {
          select: {
            userAId: true,
            userBId: true,
          },
        },
      },
    });

    if (!meetup) {
      throw new NotFoundException(
        'Encuentro no encontrado o no autorizado',
      );
    }

    if (
      meetup.status !== 'CONFIRMED' &&
      meetup.status !== 'COMPLETED'
    ) {
      throw new BadRequestException(
        'Solo puedes evaluar un encuentro confirmado o completado',
      );
    }

    if (meetup.startAt.getTime() > Date.now()) {
      throw new BadRequestException(
        'Todavía no puedes evaluar este encuentro',
      );
    }

    const reviewedUserId =
      meetup.connection.userAId === reviewerId
        ? meetup.connection.userBId
        : meetup.connection.userAId;

    if (reviewedUserId === reviewerId) {
      throw new BadRequestException(
        'No puedes evaluarte a ti mismo',
      );
    }

    const existingReview =
      await this.prisma.meetupReview.findUnique({
        where: {
          meetupId_reviewerId: {
            meetupId,
            reviewerId,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingReview) {
      throw new BadRequestException(
        'Ya has evaluado este encuentro',
      );
    }

    const review = await this.prisma.meetupReview.create({
      data: {
        meetupId,
        reviewerId,
        reviewedUserId,
        overallRating: dto.overallRating,
        petBehaviorRating:
          dto.petBehaviorRating ?? null,
        comment: dto.comment?.trim() || null,
      },
    });

    return review;
  }

  async hasReviewed(
    meetupId: string,
    reviewerId: string,
  ) {
    const meetup = await this.prisma.meetup.findFirst({
      where: {
        id: meetupId,
        connection: {
          OR: [
            { userAId: reviewerId },
            { userBId: reviewerId },
          ],
        },
      },
      select: {
        id: true,
      },
    });

    if (!meetup) {
      throw new NotFoundException(
        'Encuentro no encontrado o no autorizado',
      );
    }

    const review = await this.prisma.meetupReview.findUnique({
      where: {
        meetupId_reviewerId: {
          meetupId,
          reviewerId,
        },
      },
      select: {
        id: true,
      },
    });

    return {
      reviewed: Boolean(review),
    };
  }
}