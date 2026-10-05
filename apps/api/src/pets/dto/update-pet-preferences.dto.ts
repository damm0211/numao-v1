import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePetPreferencesDto {
  @IsOptional()
  @IsBoolean()
  play?: boolean;

  @IsOptional()
  @IsBoolean()
  walk?: boolean;

  @IsOptional()
  @IsBoolean()
  socialize?: boolean;

  @IsOptional()
  @IsBoolean()
  reproduction?: boolean;
}