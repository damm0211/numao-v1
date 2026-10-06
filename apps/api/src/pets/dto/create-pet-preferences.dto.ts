import { IsBoolean, IsOptional } from 'class-validator';

export class CreatePetPreferencesDto {
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
