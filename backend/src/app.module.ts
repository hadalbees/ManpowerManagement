import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthorizationModule } from './modules/authorization/authorization.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClientsModule } from './modules/clients/clients.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { LeaveModule } from './modules/leave/leave.module';
import { ReplacementsModule } from './modules/replacements/replacements.module';
import { PayrollModule } from './modules/payroll/payroll.module';
import { BillingModule } from './modules/billing/billing.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthModule } from './modules/health/health.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthorizationModule,
    AuditModule,
    AuthModule,
    ClientsModule,
    EmployeesModule,
    VehiclesModule,
    DeploymentsModule,
    AttendanceModule,
    LeaveModule,
    ReplacementsModule,
    PayrollModule,
    BillingModule,
    DocumentsModule,
    ComplianceModule,
    RecruitmentModule,
    NotificationsModule,
    ReportsModule,
    AnalyticsModule,
    HealthModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
