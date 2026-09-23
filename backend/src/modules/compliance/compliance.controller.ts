import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { ComplianceQueryDto, AcknowledgeAlertDto } from './dto/compliance.dto';

@Controller('compliance')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('dashboard')
  @RequirePermission('COMPLIANCE_READ')
  async getComplianceDashboard(
    @Query('branchId') branchId: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.getComplianceDashboard(user, branchId);
  }

  @Get('documents')
  @RequirePermission('COMPLIANCE_READ')
  async getComplianceDocuments(
    @Query() query: ComplianceQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.getComplianceDocuments(query, user);
  }

  @Post('process-alerts')
  @RequirePermission('COMPLIANCE_UPDATE')
  async processExpiryAlerts(@CurrentUser() user: AuthenticatedUserContext) {
    return this.complianceService.processExpiryAlerts(user.agencyId, user);
  }

  @Post('alerts/:id/acknowledge')
  @RequirePermission('COMPLIANCE_UPDATE')
  async acknowledgeAlert(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AcknowledgeAlertDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.complianceService.acknowledgeAlert(id, dto, user);
  }
}
