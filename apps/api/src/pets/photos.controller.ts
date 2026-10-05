import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { Request } from 'express';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { mkdirSync } from 'fs';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhotosService } from './photos.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

const uploadDirectory =
  'uploads/pets';

mkdirSync(uploadDirectory, {
  recursive: true,
});

@Controller('pets/:petId/photos')
@UseGuards(JwtAuthGuard)
export class PhotosController {
  constructor(
    private readonly photosService: PhotosService,
  ) {}

  @Get()
  async list(
    @Param('petId') petId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.photosService.list(
      petId,
      request.user.id,
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: uploadDirectory,

        filename: (
          _request,
          file,
          callback,
        ) => {
          const extension =
            extname(file.originalname)
              .toLowerCase() || '.jpg';

          callback(
            null,
            `${randomUUID()}${extension}`,
          );
        },
      }),

      limits: {
        fileSize: 8 * 1024 * 1024,
      },

      fileFilter: (
        _request,
        file,
        callback,
      ) => {
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
        ];

        if (
          !allowedTypes.includes(
            file.mimetype,
          )
        ) {
          return callback(
            new BadRequestException(
              'Solo se permiten imágenes JPG, PNG o WEBP.',
            ),
            false,
          );
        }

        callback(null, true);
      },
    }),
  )
  async upload(
    @Param('petId') petId: string,
    @Req() request: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Debes seleccionar una fotografía.',
      );
    }

    return this.photosService.create(
      petId,
      request.user.id,
      `pets/${file.filename}`,
    );
  }

  @Patch(':photoId/primary')
  async setPrimary(
    @Param('petId') petId: string,
    @Param('photoId') photoId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.photosService.setPrimary(
      petId,
      photoId,
      request.user.id,
    );
  }

  @Delete(':photoId')
  async remove(
    @Param('petId') petId: string,
    @Param('photoId') photoId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.photosService.remove(
      petId,
      photoId,
      request.user.id,
    );
  }
}