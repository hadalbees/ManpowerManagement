import { Module } from '@nestjs/common';
import { ReplacementsService } from './replacements.service';
import { ReplacementsController } from './replacements.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule],
  controllers: [ReplacementsController],
  providers: [ReplacementsService],
  exports: [ReplacementsService],
})
export class ReplacementsModule {}
