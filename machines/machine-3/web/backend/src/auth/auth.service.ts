import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuthUser } from '../common/types';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  private sanitize(user: any) {
    const { passwordHash, ...rest } = user;
    return rest;
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
        settings: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await bcrypt.compare(password, user.passwordHash).catch(() => false);
    const plainOk = user.passwordHash === password; // fallback for demo seeds if hashes not migrated

    if (!ok && !plainOk) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(dto: LoginDto) {
    const user = await this.validateUser(dto.email, dto.password);
    const token = await this.jwt.signAsync({ sub: user.id, role: user.globalRole });
    return { token, user: this.sanitize(user) };
  }

  async me(authUser: AuthUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: authUser.userId },
      include: {
        department: true,
        manager: { select: { id: true, fullName: true, jobTitle: true } },
        directReports: { select: { id: true, fullName: true, jobTitle: true } },
        memberships: { include: { project: true } },
        settings: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return this.sanitize(user);
  }
}
