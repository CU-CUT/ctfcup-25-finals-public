import { Injectable, NotFoundException } from '@nestjs/common';
import { AccessLevel } from '@prisma/client';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async getProject(id: number, requester?: AuthUser) {
    const requesterInfo = requester
      ? await this.prisma.user.findUnique({ where: { id: requester.userId }, select: { id: true, departmentId: true } })
      : null;

    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        department: true,
        memberships: {
          include: {
            user: { include: { department: true } },
          },
        },
        files: { include: { owner: { select: { id: true, departmentId: true, department: { select: { name: true, code: true } } } } } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');

    const files = project.files.map((file) => {
      const sameOwner = requesterInfo?.id === file.ownerId;
      const sameDepartment = requesterInfo?.departmentId && requesterInfo.departmentId === file.owner.departmentId;
      const canDownload =
        file.accessLevel === AccessLevel.public ||
        (file.accessLevel === AccessLevel.department && sameDepartment) ||
        (file.accessLevel === AccessLevel.personal && sameOwner);
      return { ...file, canDownload };
    });

    return { ...project, files };
  }

  async getMembers(id: number) {
    return this.prisma.projectMembership.findMany({
      where: { projectId: id },
      include: {
        user: {
          include: {
            department: true,
          },
        },
      },
    });
  }
}
