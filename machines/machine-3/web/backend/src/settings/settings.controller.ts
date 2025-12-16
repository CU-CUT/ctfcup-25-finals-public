import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '../common/types';
import { SettingsService } from './settings.service';
import { UpdateThemeDto } from './dto/update-theme.dto';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  getSettings(@CurrentUser() user: AuthUser) {
    return this.settings.getSettings(user.userId);
  }

  @Post('theme')
  updateTheme(@CurrentUser() user: AuthUser, @Body() dto: UpdateThemeDto) {
    return this.settings.updateTheme(user.userId, dto.theme);
  }
}
