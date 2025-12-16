import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { OrgModule } from './org/org.module';
import { ProjectsModule } from './projects/projects.module';
import { FilesModule } from './files/files.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    OrgModule,
    ProjectsModule,
    FilesModule,
    SettingsModule,
  ],
})
export class AppModule {}
