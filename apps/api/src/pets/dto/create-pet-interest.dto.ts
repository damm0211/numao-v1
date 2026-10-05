import { IsEnum, IsString } from 'class-validator';
import { InterestType } from '@prisma/client';

export class CreatePetInterestDto {
  @IsString()
  toPetId!: string;

  @IsEnum(InterestType)
  type!: InterestType;
}