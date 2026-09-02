import { IsEnum, IsInt, IsOptional, IsString, Min, IsArray, ArrayMinSize } from 'class-validator';
import { EventType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateBookingDto {
  @IsString()
  date: string;

  @IsEnum(EventType)
  type: EventType;

  @IsInt()
  @Min(1)
  packageId: number;

  @IsInt()
  @Min(1)
  headCountAdult: number;

  @IsInt()
  @Min(0)
  headCountChild: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  activityIds?: number[];

  @IsOptional()
  @IsString()
  discountCode?: string;

  @IsOptional()
  @IsString()
  guestName?: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;
}
