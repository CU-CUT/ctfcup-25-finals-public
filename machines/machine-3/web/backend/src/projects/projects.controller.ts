import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get(':id')
  getProject(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.projects.getProject(id, user);
  }

  @Get(':id/members')
  members(@Param('id', ParseIntPipe) id: number) {
    return this.projects.getMembers(id);
  }
}
