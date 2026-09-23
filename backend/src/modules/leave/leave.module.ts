import { Module } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveController, LeaveRequestsAliasController } from './leave.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule],
  controllers: [LeaveController, LeaveRequestsAliasController],
  providers: [LeaveService],
  exports: [LeaveService],
})
export class LeaveModule {}
