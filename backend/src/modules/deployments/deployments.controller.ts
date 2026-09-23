import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import { DeploymentsService } from './deployments.service';
import {
  CreateDeploymentDto,
  UpdateDeploymentDto,
  EndDeploymentDto,
  ReassignDeploymentDto,
  DeploymentQueryDto,
} from './dto/deployment.dto';

@Controller('deployments')
@UseGuards(JwtAuthGuard, PermissionsGuard, AgencyBranchContextGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  // ==========================================
  // METADATA & LOOKUP OPTIONS
  // ==========================================

  @Get('options')
  @RequirePermission('DEPLOYMENT_READ')
  getDeploymentOptions(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query('clientId') clientId?: string,
    @Query('employeeId') employeeId?: string,
  ) {
    return this.deploymentsService.getDeploymentOptions(user, clientId, employeeId);
  }

  // ==========================================
  // DEPLOYMENT MASTER REST ENDPOINTS
  // ==========================================

  @Post()
  @RequirePermission('DEPLOYMENT_CREATE')
  createDeployment(
    @Body() dto: CreateDeploymentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.deploymentsService.createDeployment(dto, user);
  }

  @Get()
  @RequirePermission('DEPLOYMENT_READ')
  getDeployments(
    @Query() query: DeploymentQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.deploymentsService.getDeployments(query, user);
  }

  @Get(':id')
  @RequirePermission('DEPLOYMENT_READ')
  getDeploymentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.deploymentsService.getDeploymentById(id, user);
  }

  @Patch(':id')
  @RequirePermission('DEPLOYMENT_UPDATE')
  updateDeployment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeploymentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.deploymentsService.updateDeployment(id, dto, user);
  }

  @Post(':id/end')
  @RequirePermission('DEPLOYMENT_END')
  endDeployment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndDeploymentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.deploymentsService.endDeployment(id, dto, user);
  }

  @Post(':id/reassign')
  @RequirePermission('DEPLOYMENT_REASSIGN')
  reassignDeployment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReassignDeploymentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.deploymentsService.reassignDeployment(id, dto, user);
  }
}
