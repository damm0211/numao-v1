import { IsIn } from 'class-validator';

export class UpdateMeetupStatusDto {
  @IsIn(['CONFIRMED', 'CANCELLED', 'COMPLETED'])
  status!: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
}
