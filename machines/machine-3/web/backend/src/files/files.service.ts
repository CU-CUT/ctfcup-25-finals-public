import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessLevel } from '@prisma/client';
import { Response } from 'express';
import { createReadStream, existsSync } from 'fs';
import { resolve } from 'path';
import { AuthUser } from '../common/types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FilesService {
    private storageRoot: string;
    private sanitizeFilename(name: string) {
        const safe = name.replace(/[\r\n]/g, '').replace(/["]/g, '').replace(/[^\x20-\x7E]/g, '_');
        const encoded = encodeURIComponent(name);
        return {
            header: `attachment; filename="${safe || 'file'}"; filename*=UTF-8''${encoded}`,
        };
    }

    constructor(private prisma: PrismaService, config: ConfigService) {
        this.storageRoot = config.get<string>('STORAGE_ROOT') ?? './storage';
    }

    async list(ownerId: number | undefined, departmentId: number | undefined, requester?: AuthUser) {
        const where: any = {};
        if (ownerId) where.ownerId = ownerId;
        if (departmentId) where.owner = { departmentId };

        const requesterInfo = requester
            ? await this.prisma.user.findUnique({ where: { id: requester.userId }, select: { id: true, departmentId: true } })
            : null;

        const files = await this.prisma.file.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                mimeType: true,
                sizeBytes: true,
                accessLevel: true,
                project: { select: { id: true, name: true, code: true } },
                owner: {
                    select: { id: true, fullName: true, jobTitle: true, departmentId: true, department: { select: { name: true, code: true } } },
                },
                path: true,
                createdAt: true,
            },
        });

        return files.map((file) => {
            const sameOwner = requesterInfo?.id === file.owner.id;
            const sameDepartment = requesterInfo?.departmentId && requesterInfo.departmentId === file.owner.departmentId;
            const canDownload =
                file.accessLevel === AccessLevel.public ||
                (file.accessLevel === AccessLevel.department && sameDepartment) ||
                (file.accessLevel === AccessLevel.personal && sameOwner);
            return { ...file, canDownload };
        });
    }

    async download(id: number, requester: AuthUser, res: Response) {
        const file = await this.prisma.file.findUnique({
            where: { id },
            include: { owner: { select: { departmentId: true, id: true } } },
        });
        if (!file) {
            throw new NotFoundException('File not found');
        }

        const requesterInfo = await this.prisma.user.findUnique({
            where: { id: requester.userId },
            select: { id: true, departmentId: true },
        });

        const sameOwner = requester.userId === file.ownerId;
        const sameDepartment = requesterInfo?.departmentId && requesterInfo.departmentId === file.owner.departmentId;

        const allowed =
            file.accessLevel === AccessLevel.public ||
            (file.accessLevel === AccessLevel.department && sameDepartment) ||
            (file.accessLevel === AccessLevel.personal && sameOwner);

        if (!allowed) throw new ForbiddenException('Недостаточно прав');

        const absolutePath = resolve(this.storageRoot, file.path);

        if (!existsSync(absolutePath)) {
            throw new NotFoundException('Missing file on disk');
        }

        res.setHeader('Content-Type', `${file.mimeType}; charset=utf-8`);
        res.setHeader('Content-Disposition', this.sanitizeFilename(file.name).header);
        const stream = createReadStream(absolutePath);
        stream.pipe(res);
    }

    async downloadByDepartment(department: string, tail: string, res: Response) {
        const decoded = decodeURIComponent(`${department}/${tail}`);

        const dbFile = await this.prisma.file.findFirst({
            where: { path: `files/${decoded}` },
            include: { owner: { select: { id: true, departmentId: true } } },
        });

        const downloadName = dbFile?.name ?? tail.split('/').pop() ?? decoded;

        if (dbFile) {
            const requesterInfo = await this.prisma.user.findUnique({
                where: { id: res.locals?.user?.userId ?? 0 },
                select: { id: true, departmentId: true },
            });

            const sameOwner = requesterInfo?.id === dbFile.ownerId;
            const sameDepartment = requesterInfo?.departmentId && requesterInfo.departmentId === dbFile.owner.departmentId;

            const allowed =
                dbFile.accessLevel === AccessLevel.public ||
                (dbFile.accessLevel === AccessLevel.department && sameDepartment) ||
                (dbFile.accessLevel === AccessLevel.personal && sameOwner);

            if (!allowed) throw new ForbiddenException('Недостаточно прав');
        }

        const fullPath = `${this.storageRoot}/files/${decoded}`;
        res.setHeader('Content-Type', `${dbFile?.mimeType ?? 'application/octet-stream'}; charset=utf-8`);
        res.setHeader('Content-Disposition', this.sanitizeFilename(downloadName).header);
        const stream = createReadStream(fullPath);
        stream.on('error', () => res.status(404).end());
        stream.pipe(res);
    }
}
