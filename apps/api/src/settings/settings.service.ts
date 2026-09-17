import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllSettings() {
    return this.prisma.setting.findMany({
      orderBy: { key: 'asc' }
    });
  }

  async getSettingByKey(key: string) {
    const setting = await this.prisma.setting.findUnique({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting with key ${key} not found`);
    }
    return setting;
  }

  async updateSetting(key: string, value: string, type?: string, category?: string) {
    return this.prisma.setting.upsert({
      where: { key },
      update: {
        value,
        ...(type && { type }),
        ...(category && { category }),
      },
      create: {
        key,
        value,
        type: type || 'STRING',
        category: category || 'GENERAL',
      },
    });
  }

  async deleteSetting(key: string) {
    return this.prisma.setting.delete({ where: { key } });
  }
}
