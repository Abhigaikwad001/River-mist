import { IsString, IsNotEmpty, IsOptional, IsNumber, IsArray, IsEmail } from 'class-validator';

export class ValidateDiscountDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsOptional()
  @IsNumber()
  packageId?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  activityIds?: number[];

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsEmail()
  guestEmail?: string;
}
