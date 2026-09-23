import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EncryptionService } from '../../common/services/encryption.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuthorizationModule, AuditModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EncryptionService],
  exports: [EmployeesService, EncryptionService],
})
export class EmployeesModule {}
