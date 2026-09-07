import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsNotEmpty()
  eventDate!: string;

  @IsString()
  @IsOptional()
  startTime?: string;

  @IsString()
  @IsOptional()
  endTime?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  status?: string; // DRAFT, PUBLISHED, FULL, CANCELLED, COMPLETED

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
