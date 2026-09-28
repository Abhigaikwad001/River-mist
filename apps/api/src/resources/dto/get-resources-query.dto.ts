import { IsOptional, IsString } from 'class-validator';

export class GetResourcesQueryDto {
  @IsOptional()
  includeInactive?: string | boolean;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
