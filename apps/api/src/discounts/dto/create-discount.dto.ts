import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  IsIn,
  IsDateString,
} from 'class-validator';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT', 'FIXED'])
  type: string;

  @IsNumber()
  @Min(0)
  value: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minBookingAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  perCustomerLimit?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePackages?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableActivities?: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  usageLimit?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsNumber()
  displayOrder?: number;
}
