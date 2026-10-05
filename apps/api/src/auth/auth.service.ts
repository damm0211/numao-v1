import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const birthDate = new Date(dto.birthDate);

    if (Number.isNaN(birthDate.getTime())) {
      throw new UnauthorizedException('Fecha de nacimiento inválida');
    }

    const age = this.calculateAge(birthDate);

    if (age < 18) {
      throw new UnauthorizedException(
        'Debes tener al menos 18 años para utilizar NUMAO',
      );
    }

    const email = dto.email.trim().toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName: dto.name.trim(),
        dateOfBirth: birthDate,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        dateOfBirth: true,
        createdAt: true,
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }
async login(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await this.prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (!user) {
    throw new UnauthorizedException('Email o contraseña incorrectos');
  }

  const passwordValid = await bcrypt.compare(
    password,
    user.passwordHash,
  );

  if (!passwordValid) {
    throw new UnauthorizedException('Email o contraseña incorrectos');
  }

  if (user.status !== 'ACTIVE') {
    throw new UnauthorizedException('La cuenta no está activa');
  }

  const accessToken = await this.jwtService.signAsync({
    sub: user.id,
    email: user.email,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      dateOfBirth: user.dateOfBirth,
      createdAt: user.createdAt,
    },
    accessToken,
  };
}
  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        dateOfBirth: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Usuario no encontrado',
      );
    }

    return {
      user,
    };
  }

  async updateMe(
    userId: string,
    data: {
      displayName?: string;
      email?: string;
      birthDate?: string;
    },
  ) {
    const currentUser =
      await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

    if (!currentUser) {
      throw new UnauthorizedException(
        'Usuario no encontrado',
      );
    }

    const updateData: {
      displayName?: string;
      email?: string;
      dateOfBirth?: Date;
    } = {};

    if (data.displayName !== undefined) {
      const displayName =
        data.displayName.trim();

      if (displayName.length < 2) {
        throw new UnauthorizedException(
          'El nombre debe tener al menos 2 caracteres',
        );
      }

      updateData.displayName = displayName;
    }

    if (data.email !== undefined) {
      const email =
        data.email.trim().toLowerCase();

      if (!email) {
        throw new UnauthorizedException(
          'El email no puede estar vacío',
        );
      }

      const existingUser =
        await this.prisma.user.findFirst({
          where: {
            email,
            NOT: {
              id: userId,
            },
          },
        });

      if (existingUser) {
        throw new ConflictException(
          'El email ya está registrado',
        );
      }

      updateData.email = email;
    }

    if (data.birthDate !== undefined) {
      const birthDate =
        new Date(data.birthDate);

      if (
        Number.isNaN(
          birthDate.getTime(),
        )
      ) {
        throw new UnauthorizedException(
          'Fecha de nacimiento inválida',
        );
      }

      if (
        this.calculateAge(birthDate) < 18
      ) {
        throw new UnauthorizedException(
          'Debes tener al menos 18 años para utilizar NUMAO',
        );
      }

      updateData.dateOfBirth =
        birthDate;
    }

    const user =
      await this.prisma.user.update({
        where: {
          id: userId,
        },
        data: updateData,
        select: {
          id: true,
          email: true,
          displayName: true,
          dateOfBirth: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return {
      user,
    };
  }
  private calculateAge(birthDate: Date): number {
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();

    const monthDifference = today.getMonth() - birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }
}