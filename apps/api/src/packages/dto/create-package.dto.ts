import { 
  IsString, IsNotEmpty, IsEnum, IsNumber, 
  IsBoolean, IsOptional, IsArray, IsDate, Min
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { EventType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

export class CreatePackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(EventType)
  experienceType: EventType;

  @IsString()
  @IsOptional()
  image?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'priceAdult must be a valid number' })
  @Min(0, { message: 'priceAdult cannot be negative' })
  @Transform(({ value }) => {
    const num = Number(value);
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      throw new BadRequestException('priceAdult must be a finite number');
    }
    return num;
  })
  priceAdult: number;

  @Type(() => Number)
  @IsNumber({}, { message: 'priceChild must be a valid number' })
  @Min(0, { message: 'priceChild cannot be negative' })
  @Transform(({ value }) => {
    const num = Number(value);
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      throw new BadRequestException('priceChild must be a finite number');
    }
    return num;
  })
  priceChild: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1, { message: 'minGuests must be at least 1' })
  minGuests: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  maxGuests?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  seasonalActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validFrom?: Date | null;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  validUntil?: Date | null;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value.split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }
    return value;
  })
  inclusions?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  displayOrder?: number;
}
