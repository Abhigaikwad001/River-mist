import { IsString, IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SetDailyCapacityOverrideDto {
  @ApiProperty({ description: 'Business date in YYYY-MM-DD or ISO timestamp format', example: '2026-09-09' })
  @IsString()
  date: string;

  @ApiPropertyOptional({ description: 'Custom capacity limit for the primary resource (pax)', example: 350 })
  @IsOptional()
  @IsInt()
  @Min(0)
  customCapacity?: number | null;

  @ApiPropertyOptional({ description: 'Whether the resort is fully closed / blacked out for this date', example: false })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @ApiPropertyOptional({ description: 'Reason for closure or capacity override', example: 'Annual maintenance & landscaping' })
  @IsOptional()
  @IsString()
  reason?: string | null;
}
