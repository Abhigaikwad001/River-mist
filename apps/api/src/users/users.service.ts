import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '@prisma/client';

const VALID_ROLES = Object.values(Role);

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

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

  async updateUserRole(id: string, role: string, actorUserId?: number) {
    if (!VALID_ROLES.includes(role as Role)) {
      throw new BadRequestException(`Invalid role: ${role}. Valid roles: ${VALID_ROLES.join(', ')}`);
    }

    const userId = parseInt(id, 10);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const previousRole = user.role;
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role: role as Role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      }
    });

    await this.auditService.logAction({
      action: 'UPDATE',
      entity: 'USER',
      entityId: userId,
      userId: actorUserId,
      description: `Updated user role for ${user.email} from ${previousRole} to ${role}`,
      oldValue: { role: previousRole },
      newValue: { role },
    });

    return updatedUser;
  }
}


