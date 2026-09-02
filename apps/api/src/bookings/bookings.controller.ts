import { Controller, Post, Get, Body, Request, UseGuards, Param, ForbiddenException, BadRequestException } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, EventType } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateBookingDto } from './dto/create-booking.dto/create-booking.dto';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiOperation({ summary: 'Create a new booking' })
  @UseGuards(OptionalJwtAuthGuard)
  @Post()
  createBooking(@Body() body: CreateBookingDto, @Request() req: any) {
    // If no user is authenticated, it will use a guest user internally
    const userId = req.user?.id;
    return this.bookingsService.createBooking(body, userId);
  }

  @ApiOperation({ summary: 'Get my bookings' })
  @UseGuards(JwtAuthGuard)
  @Get('my-bookings')
  getMyBookings(@Request() req: any) {
    return this.bookingsService.getMyBookings(req.user.id);
  }
  
  @ApiOperation({ summary: 'Check availability for a date' })
  @Post('check-availability')
  checkAvailability(@Body() body: { date: string; guests: number; type: any }) {
    if (body.type && !Object.values(EventType).includes(body.type)) {
      throw new BadRequestException(`Invalid event type: ${body.type}`);
    }
    return this.bookingsService.checkCapacity(body.date, body.guests, body.type);
  }

  // --- ADMIN ROUTES ---

  @ApiOperation({ summary: 'Get all bookings (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Get()
  getAllBookings() {
    return this.bookingsService.getAllBookings();
  }

  @ApiOperation({ summary: 'Update booking status (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Post(':id/status')
  updateBookingStatus(
    @Param('id') id: string,
    @Body('status') status: any
  ) {
    return this.bookingsService.updateBookingStatus(Number(id), status);
  }

  @ApiOperation({ summary: 'Update booking notes (Admin)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.BOOKING_MANAGER)
  @Post(':id/notes')
  updateBookingNotes(
    @Param('id') id: string,
    @Body('notes') notes: string
  ) {
    return this.bookingsService.updateBookingNotes(Number(id), notes);
  }

  @ApiOperation({ summary: 'Get a specific booking' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  async getBooking(@Param('id') id: string, @Request() req: any) {
    const booking = await this.bookingsService.getBookingById(Number(id));
    if (booking.userId !== req.user?.id && req.user?.role !== Role.SUPER_ADMIN && req.user?.role !== Role.BOOKING_MANAGER) {
      throw new ForbiddenException('You do not have permission to view this booking');
    }
    return booking;
  }

  @ApiOperation({ summary: 'Get booking status' })
  @UseGuards(OptionalJwtAuthGuard)
  @Get('status/:id')
  async getBookingStatus(@Param('id') id: string, @Request() req: any) {
    const booking = await this.bookingsService.getBookingById(Number(id));
    if (booking.userId !== req.user?.id && req.user?.role !== Role.SUPER_ADMIN && req.user?.role !== Role.BOOKING_MANAGER) {
      throw new ForbiddenException('You do not have permission to view this booking');
    }
    return { status: booking.status };
  }
}
