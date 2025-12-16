import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgService {
  constructor(private prisma: PrismaService) {}

  async listUsers(depId?: number, search?: string) {
    const where: Prisma.UserWhereInput = {};
    if (depId) {
      where.departmentId = depId;
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { jobTitle: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        department: true,
        manager: { select: { id: true, fullName: true, jobTitle: true } },
        memberships: { include: { project: true } },
      },
    });
  }

  async getUser(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        manager: { select: { id: true, fullName: true, jobTitle: true } },
        directReports: { select: { id: true } },
        memberships: { include: { project: true } },
      },
    });
  }

  async listDepartments() {
    return this.prisma.department.findMany({
      include: { children: true },
      orderBy: { id: 'asc' },
    });
  }

  async listProjects() {
    return this.prisma.project.findMany({
      include: {
        department: true,
        memberships: { include: { user: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
