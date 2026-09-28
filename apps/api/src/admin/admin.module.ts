import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CapacityModule } from '../capacity/capacity.module';

@Module({
  imports: [PrismaModule, CapacityModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
