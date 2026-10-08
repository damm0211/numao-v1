import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMeetupDto {
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  placeName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  placeAddress?: string;

  @IsOptional()
  @IsString()
  petFriendlyPlaceId?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsISO8601()
  startAt!: string;
}
