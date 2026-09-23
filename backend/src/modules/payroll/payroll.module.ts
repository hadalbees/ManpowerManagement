import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { StatutoryService } from './statutory.service';
import { PayslipService } from './payslip.service';
import { PayrollController } from './payroll.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { AuthorizationModule } from '../authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuditModule, AuthorizationModule],
  controllers: [PayrollController],
  providers: [PayrollService, StatutoryService, PayslipService],
  exports: [PayrollService, StatutoryService, PayslipService],
})
export class PayrollModule {}
