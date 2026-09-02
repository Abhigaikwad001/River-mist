import { Controller, Post, Get, Patch, Body, Param, ParseIntPipe, UseGuards, Request, Query } from '@nestjs/common';
import { QuotesService } from './quotes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard'; 
import { Roles } from '../auth/roles.decorator'; 
import { QuoteStatus, Role } from '@prisma/client';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  async createQuote(@Body() body: any, @Request() req: any) {
    // Attempt to pull user ID if they are logged in, otherwise let service handle guest
    const authUserId = req.user?.id;
    return this.quotesService.createQuote(body, authUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-quotes')
  async getMyQuotes(@Request() req: any) {
    return this.quotesService.getMyQuotes(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER)
  @Get()
  async getAllQuotes(@Query('type') type?: string) {
    return this.quotesService.getAllQuotes(type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER)
  @Patch(':id/status')
  async updateQuoteStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: QuoteStatus
  ) {
    return this.quotesService.updateQuoteStatus(id, status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER)
  @Patch(':id/items')
  async updateQuoteItems(
    @Param('id', ParseIntPipe) id: number,
    @Body('items') items: any[]
  ) {
    return this.quotesService.updateQuoteItems(id, items);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER, Role.EVENT_MANAGER)
  @Post(':id/convert')
  async convertQuoteToBooking(
    @Param('id', ParseIntPipe) id: number
  ) {
    return this.quotesService.convertQuoteToBooking(id);
  }
}
