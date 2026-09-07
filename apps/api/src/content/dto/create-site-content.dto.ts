import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, Matches } from 'class-validator';

export class CreateSiteContentDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message: 'Key must only contain letters, numbers, dots, underscores, and hyphens',
  })
  key: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  subtitle?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsNumber()
  @IsOptional()
  mediaId?: number;
}
