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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { LeaveService } from './leave.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateLeaveTypeDto,
  UpdateLeaveTypeDto,
  CreateLeaveBalanceDto,
  AdjustLeaveBalanceDto,
  LeaveBalanceQueryDto,
  CreateLeaveRequestDto,
  UpdateLeaveRequestDto,
  ApproveLeaveRequestDto,
  RejectLeaveRequestDto,
  CancelLeaveRequestDto,
  LeaveRequestQueryDto,
} from './dto/leave.dto';

@Controller('leave')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  // ==========================================
  // LEAVE TYPES
  // ==========================================

  @Post('types')
  @RequirePermission('LEAVE_CREATE')
  async createLeaveType(
    @Body() dto: CreateLeaveTypeDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.createLeaveType(dto, user);
  }

  @Get('types')
  @RequirePermission('LEAVE_READ')
  async getLeaveTypes(
    @Query('activeOnly') activeOnly: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveTypes(user, activeOnly === 'true');
  }

  @Get('types/:id')
  @RequirePermission('LEAVE_READ')
  async getLeaveTypeById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveTypeById(id, user);
  }

  @Patch('types/:id')
  @RequirePermission('LEAVE_UPDATE')
  async updateLeaveType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveTypeDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.updateLeaveType(id, dto, user);
  }

  // ==========================================
  // LEAVE BALANCES
  // ==========================================

  @Post('balances')
  @RequirePermission('LEAVE_BALANCE_UPDATE')
  async createLeaveBalance(
    @Body() dto: CreateLeaveBalanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.createLeaveBalance(dto, user);
  }

  @Get('balances')
  @RequirePermission('LEAVE_BALANCE_READ')
  async getLeaveBalances(
    @Query() query: LeaveBalanceQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveBalances(query, user);
  }

  @Post('balances/:id/adjust')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_BALANCE_UPDATE')
  async adjustLeaveBalance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdjustLeaveBalanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.adjustLeaveBalance(id, dto, user);
  }

  // ==========================================
  // LEAVE REQUESTS
  // ==========================================

  @Post('requests')
  @RequirePermission('LEAVE_CREATE')
  async createLeaveRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.createLeaveRequest(dto, user);
  }

  @Get('requests')
  @RequirePermission('LEAVE_READ')
  async getLeaveRequests(
    @Query() query: LeaveRequestQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveRequests(query, user);
  }

  @Get('requests/:id')
  @RequirePermission('LEAVE_READ')
  async getLeaveRequestById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveRequestById(id, user);
  }

  @Patch('requests/:id')
  @RequirePermission('LEAVE_UPDATE')
  async updateLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.updateLeaveRequest(id, dto, user);
  }

  @Post('requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_APPROVE')
  async approveLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.approveLeaveRequest(id, dto, user);
  }

  @Post('requests/:id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_REJECT')
  async rejectLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.rejectLeaveRequest(id, dto, user);
  }

  @Post('requests/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_CANCEL')
  async cancelLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.cancelLeaveRequest(id, dto, user);
  }
}

// Direct /leave-requests route alias controller
@Controller('leave-requests')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class LeaveRequestsAliasController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  @RequirePermission('LEAVE_CREATE')
  async createLeaveRequest(
    @Body() dto: CreateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.createLeaveRequest(dto, user);
  }

  @Get()
  @RequirePermission('LEAVE_READ')
  async getLeaveRequests(
    @Query() query: LeaveRequestQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveRequests(query, user);
  }

  @Get(':id')
  @RequirePermission('LEAVE_READ')
  async getLeaveRequestById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.getLeaveRequestById(id, user);
  }

  @Patch(':id')
  @RequirePermission('LEAVE_UPDATE')
  async updateLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.updateLeaveRequest(id, dto, user);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_APPROVE')
  async approveLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.approveLeaveRequest(id, dto, user);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_REJECT')
  async rejectLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.rejectLeaveRequest(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('LEAVE_CANCEL')
  async cancelLeaveRequest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelLeaveRequestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.leaveService.cancelLeaveRequest(id, dto, user);
  }
}
