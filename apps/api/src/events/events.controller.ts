import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Query, ValidationPipe, ParseIntPipe } from '@nestjs/common';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  getEvents(
    @Query('activeOnly') activeOnly?: string,
    @Query('status') status?: string
  ) {
    const filters: any = {};
    if (activeOnly === 'true') filters.active = true;
    if (status) filters.status = status.toUpperCase();
    return this.eventsService.getEvents(filters);
  }

  @Get(':id')
  getEventById(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.getEventById(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.CONTENT_MANAGER)
  @Post()
  createEvent(@Body(new ValidationPipe({ whitelist: true, transform: true })) data: CreateEventDto) {
    return this.eventsService.createEvent(data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.CONTENT_MANAGER)
  @Patch(':id')
  updateEvent(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) data: UpdateEventDto
  ) {
    return this.eventsService.updateEvent(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SUPER_ADMIN, Role.EVENT_MANAGER, Role.CONTENT_MANAGER)
  @Delete(':id')
  deleteEvent(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.deleteEvent(id);
  }
}
