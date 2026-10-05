import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePetDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsDateString()
  birthDate!: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsIn(['SMALL', 'MEDIUM', 'LARGE'])
  size?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  energyLevel?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  sociability?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  playfulness?: number;

  @IsOptional()
  @IsString()
  bio?: string;
}