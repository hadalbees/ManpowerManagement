import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { ReportFilterDto, ReportFormat } from './dto/report.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @RequirePermission('REPORT_READ')
  async generateReport(
    @Body() dto: ReportFilterDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.reportsService.generateReport(
      { ...dto, format: ReportFormat.JSON },
      user,
    );
  }

  @Post('export')
  @RequirePermission('REPORT_EXPORT')
  async exportReport(
    @Body() dto: ReportFilterDto,
    @CurrentUser() user: AuthenticatedUserContext,
    @Res() res: Response,
  ) {
    const result = await this.reportsService.generateReport(
      { ...dto, format: ReportFormat.CSV },
      user,
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`);
    return res.status(200).send(result.data);
  }
}
