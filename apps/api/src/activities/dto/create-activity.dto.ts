import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min } from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  pricingType?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  capacity?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
