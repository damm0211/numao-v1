import {
  BadRequestException,
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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Request } from 'express';
import { extname } from 'path';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PhotosService } from './photos.service';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

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
      storage: memoryStorage(),

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

    const extension =
      extname(file.originalname)
        .toLowerCase() || '.jpg';

    return this.photosService.create(
      petId,
      request.user.id,
      file.buffer,
      file.mimetype,
      extension,
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