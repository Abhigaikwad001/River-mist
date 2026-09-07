import { IsInt, IsNumber, Min, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RecordManualPaymentDto {
  @IsInt()
  @Min(1)
  bookingId!: number;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  method!: string;

  @IsString()
  @IsOptional()
  referenceId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  paymentDate?: string;
}
