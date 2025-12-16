import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings(userId: number) {
    const settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    return settings ?? { userId, theme: 'light' };
  }

  async updateTheme(userId: number, theme: 'light' | 'dark') {
    return this.prisma.userSettings.upsert({
      where: { userId },
      update: { theme },
      create: { userId, theme },
    });
  }
}
