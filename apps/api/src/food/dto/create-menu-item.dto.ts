import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsInt, Min, IsArray } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  meal?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isVeg?: boolean;

  @IsBoolean()
  @IsOptional()
  isSeasonal?: boolean;

  @IsString()
  @IsOptional()
  seasonalBadge?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
