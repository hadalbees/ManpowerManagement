import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { VehiclesService } from './vehicles.service';
import {
  CreateVehicleDto,
  UpdateVehicleDto,
  UpdateVehicleStatusDto,
  VehicleQueryDto,
} from './dto/vehicle.dto';
import {
  AssignVehicleDto,
  EndVehicleAssignmentDto,
} from './dto/vehicle-assignment.dto';

@Controller('vehicles')
@UseGuards(JwtAuthGuard, PermissionsGuard, AgencyBranchContextGuard)
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  // ==========================================
  // METADATA & LOOKUPS
  // ==========================================

  @Get('types')
  @RequirePermission('VEHICLE_READ')
  getVehicleTypes() {
    return this.vehiclesService.getVehicleTypes();
  }

  @Get('fuel-types')
  @RequirePermission('VEHICLE_READ')
  getFuelTypes() {
    return this.vehiclesService.getFuelTypes();
  }

  @Get('statuses')
  @RequirePermission('VEHICLE_READ')
  getVehicleStatuses() {
    return this.vehiclesService.getVehicleStatuses();
  }

  // ==========================================
  // VEHICLE MASTER REST ENDPOINTS
  // ==========================================

  @Get()
  @RequirePermission('VEHICLE_READ')
  getVehicles(
    @Query() query: VehicleQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.getVehicles(query, user);
  }

  @Get(':id')
  @RequirePermission('VEHICLE_READ')
  getVehicleById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.getVehicleById(id, user);
  }

  @Post()
  @RequirePermission('VEHICLE_CREATE')
  createVehicle(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.createVehicle(dto, user);
  }

  @Patch(':id')
  @RequirePermission('VEHICLE_UPDATE')
  updateVehicle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.updateVehicle(id, dto, user);
  }

  @Patch(':id/status')
  @RequirePermission('VEHICLE_UPDATE')
  updateVehicleStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleStatusDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.updateVehicleStatus(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('VEHICLE_DELETE')
  deleteVehicle(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.deleteVehicle(id, user);
  }

  // ==========================================
  // TEMPORAL ASSIGNMENT LEDGER ENDPOINTS
  // ==========================================

  @Post(':id/assignments')
  @RequirePermission('VEHICLE_ASSIGN')
  assignVehicle(
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Body() dto: AssignVehicleDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.assignVehicle(vehicleId, dto, user);
  }

  @Patch(':id/assignments/:assignmentId/end')
  @RequirePermission('VEHICLE_ASSIGN')
  endVehicleAssignment(
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: EndVehicleAssignmentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.endVehicleAssignment(vehicleId, assignmentId, dto, user);
  }

  @Get(':id/assignments')
  @RequirePermission('VEHICLE_READ')
  getVehicleAssignments(
    @Param('id', ParseUUIDPipe) vehicleId: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.vehiclesService.getVehicleAssignments(vehicleId, user);
  }
}
