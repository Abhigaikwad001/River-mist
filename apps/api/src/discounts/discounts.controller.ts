import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ValidateDiscountDto } from './dto/validate-discount.dto';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  getDiscounts(@Query('activeOnly') activeOnly?: string) {
    return this.discountsService.getDiscounts(activeOnly === 'true');
  }

  @Post('validate')
  validateDiscountPost(@Body() dto: ValidateDiscountDto, @Req() req: any) {
    const authUserId = req.user?.id;
    return this.discountsService.validateDiscountCode(dto, authUserId);
  }

  @Get('validate/:code')
  validateDiscountGet(@Param('code') code: string) {
    return this.discountsService.validateDiscountCode({ code });
  }

  @Get(':id')
  getDiscountById(@Param('id') id: string) {
    return this.discountsService.getDiscountById(Number(id));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Post()
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.discountsService.createDiscount(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Patch(':id')
  updateDiscount(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountsService.updateDiscount(Number(id), dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.FINANCE_MANAGER)
  @Delete(':id')
  deleteDiscount(@Param('id') id: string) {
    return this.discountsService.deleteDiscount(Number(id));
  }
}
