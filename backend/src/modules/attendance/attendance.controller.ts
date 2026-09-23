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
import { AttendanceService } from './attendance.service';
import {
  RecordAttendanceDto,
  UpdateAttendanceDto,
  ApproveAttendanceDto,
  BulkRecordAttendanceDto,
  AttendanceQueryDto,
} from './dto/attendance.dto';

@Controller('attendance')
@UseGuards(JwtAuthGuard, PermissionsGuard, AgencyBranchContextGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  @RequirePermission('ATTENDANCE_RECORD')
  recordAttendance(
    @Body() dto: RecordAttendanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.recordAttendance(dto, user);
  }

  @Post('bulk')
  @RequirePermission('ATTENDANCE_RECORD')
  bulkRecordAttendance(
    @Body() dto: BulkRecordAttendanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.bulkRecordAttendance(dto, user);
  }

  @Get('daily-muster')
  @RequirePermission('ATTENDANCE_READ')
  getDailyMusterRoll(
    @Query('siteId', ParseUUIDPipe) siteId: string,
    @Query('date') date: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.getDailyMusterRoll(siteId, date, user);
  }

  @Get()
  @RequirePermission('ATTENDANCE_READ')
  getAttendanceRecords(
    @Query() query: AttendanceQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.getAttendanceRecords(query, user);
  }

  @Get(':id')
  @RequirePermission('ATTENDANCE_READ')
  getAttendanceById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.getAttendanceById(id, user);
  }

  @Patch(':id')
  @RequirePermission('ATTENDANCE_UPDATE')
  updateAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttendanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.updateAttendance(id, dto, user);
  }

  @Post(':id/approve')
  @RequirePermission('ATTENDANCE_APPROVE')
  approveAttendance(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveAttendanceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.attendanceService.approveAttendance(id, dto, user);
  }
}
