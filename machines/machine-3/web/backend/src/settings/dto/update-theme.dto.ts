import { IsIn } from 'class-validator';

export class UpdateThemeDto {
  @IsIn(['light', 'dark'])
  theme!: 'light' | 'dark';
}
