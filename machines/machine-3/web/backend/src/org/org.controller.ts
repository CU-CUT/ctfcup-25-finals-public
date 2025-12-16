import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrgService } from './org.service';

@UseGuards(JwtAuthGuard)
@Controller('org')
export class OrgController {
  constructor(private readonly org: OrgService) {}

  @Get('users')
  listUsers(@Query('depId') depId?: string, @Query('search') search?: string) {
    const dep = depId ? Number(depId) : undefined;
    return this.org.listUsers(dep, search);
  }

  @Get('users/:id')
  getUser(@Param('id', ParseIntPipe) id: number) {
    return this.org.getUser(id);
  }

  @Get('departments')
  listDepartments() {
    return this.org.listDepartments();
  }

  @Get('projects')
  listProjects() {
    return this.org.listProjects();
  }
}
