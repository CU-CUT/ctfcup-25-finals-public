import { Controller, Get, Param, ParseIntPipe, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthUser } from '../common/types';
import { FilesService } from './files.service';

@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
    constructor(private readonly files: FilesService) { }

    @Get()
    list(
        @CurrentUser() user: AuthUser,
        @Query('ownerId') ownerId?: string,
        @Query('departmentId') departmentId?: string,
    ) {
        const id = ownerId ? Number(ownerId) : undefined;
        const dep = departmentId ? Number(departmentId) : undefined;
        return this.files.list(id, dep, user);
    }

    @Get(':id/download')
    download(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Res() res: Response) {
        return this.files.download(id, user, res);
    }

    @Get(':department/*')
    streamByPath(@Param('department') department: string, @Req() req: Request, @Res() res: Response) {
        res.locals.user = req.user;
        const tail = req.params[0] ?? '';
        return this.files.downloadByDepartment(department, tail, res);
    }
}
