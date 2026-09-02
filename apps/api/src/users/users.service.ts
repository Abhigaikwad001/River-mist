import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

const VALID_ROLES = Object.values(Role);

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getAllUsers(role?: string) {
    const where: any = {};
    if (role) {
      if (!VALID_ROLES.includes(role as Role)) {
        throw new BadRequestException(`Invalid role filter: ${role}. Valid roles: ${VALID_ROLES.join(', ')}`);
      }
      where.role = role as Role;
    }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateUserRole(id: string, role: string) {
    if (!VALID_ROLES.includes(role as Role)) {
      throw new BadRequestException(`Invalid role: ${role}. Valid roles: ${VALID_ROLES.join(', ')}`);
    }

    const userId = parseInt(id, 10);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });
  }
}

