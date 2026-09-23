import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { AnalyticsFilterDto } from './dto/analytics.dto';

@Controller('analytics')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('kpis')
  @RequirePermission('ANALYTICS_READ')
  async getExecutiveKpis(
    @Query() filter: AnalyticsFilterDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.getExecutiveKpis(filter, user);
  }

  @Get('revenue-trends')
  @RequirePermission('ANALYTICS_READ')
  async getRevenueTrends(
    @Query() filter: AnalyticsFilterDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.getRevenueTrends(filter, user);
  }

  @Get('operations')
  @RequirePermission('ANALYTICS_READ')
  async getOperationsManpower(
    @Query() filter: AnalyticsFilterDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.analyticsService.getOperationsManpower(filter, user);
  }
}
