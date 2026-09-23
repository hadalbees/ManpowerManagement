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
import { EmployeesService } from './employees.service';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  UpdateEmployeeStatusDto,
  EmployeeQueryDto,
} from './dto/employee.dto';
import {
  AddEmployeeSkillDto,
  UpdateEmployeeSkillDto,
} from './dto/employee-skill.dto';
import {
  CreateEmployeeQualificationDto,
  UpdateEmployeeQualificationDto,
} from './dto/employee-qualification.dto';
import {
  CreateSalaryStructureDto,
  ReviseSalaryStructureDto,
} from './dto/employee-salary-structure.dto';

@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard, AgencyBranchContextGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  // ==========================================
  // MASTER LOOKUPS
  // ==========================================

  @Get('designations')
  @RequirePermission('EMPLOYEE_READ')
  getDesignations(@CurrentUser() user: AuthenticatedUserContext) {
    return this.employeesService.getDesignations(user);
  }

  @Get('skills')
  @RequirePermission('EMPLOYEE_READ')
  getSkills(@CurrentUser() user: AuthenticatedUserContext) {
    return this.employeesService.getSkills(user);
  }

  // ==========================================
  // EMPLOYEE MASTER ENDPOINTS
  // ==========================================

  @Post('employees')
  @RequirePermission('EMPLOYEE_CREATE')
  createEmployee(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.employeesService.createEmployee(user, dto);
  }

  @Get('employees')
  @RequirePermission('EMPLOYEE_READ')
  findAllEmployees(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query() query: EmployeeQueryDto,
  ) {
    return this.employeesService.findAllEmployees(user, query);
  }

  @Get('employees/:id')
  @RequirePermission('EMPLOYEE_READ')
  findEmployeeById(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.findEmployeeById(user, id);
  }

  @Get('employees/:id/sensitive')
  @RequirePermission('EMPLOYEE_VIEW_SENSITIVE')
  getSensitiveData(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.getSensitiveData(user, id);
  }

  @Patch('employees/:id')
  @RequirePermission('EMPLOYEE_UPDATE')
  updateEmployee(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.employeesService.updateEmployee(user, id, dto);
  }

  @Patch('employees/:id/status')
  @RequirePermission('EMPLOYEE_UPDATE')
  updateEmployeeStatus(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeStatusDto,
  ) {
    return this.employeesService.updateEmployeeStatus(user, id, dto);
  }

  @Delete('employees/:id')
  @RequirePermission('EMPLOYEE_DELETE')
  softDeleteEmployee(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.softDeleteEmployee(user, id);
  }

  // ==========================================
  // EMPLOYEE SKILLS ENDPOINTS
  // ==========================================

  @Post('employees/:id/skills')
  @RequirePermission('EMPLOYEE_UPDATE')
  addSkill(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddEmployeeSkillDto,
  ) {
    return this.employeesService.addSkill(user, id, dto);
  }

  @Patch('employees/:id/skills/:skillId')
  @RequirePermission('EMPLOYEE_UPDATE')
  updateSkill(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
    @Body() dto: UpdateEmployeeSkillDto,
  ) {
    return this.employeesService.updateSkill(user, id, skillId, dto);
  }

  @Delete('employees/:id/skills/:skillId')
  @RequirePermission('EMPLOYEE_UPDATE')
  removeSkill(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('skillId', ParseUUIDPipe) skillId: string,
  ) {
    return this.employeesService.removeSkill(user, id, skillId);
  }

  // ==========================================
  // EMPLOYEE QUALIFICATIONS ENDPOINTS
  // ==========================================

  @Post('employees/:id/qualifications')
  @RequirePermission('EMPLOYEE_UPDATE')
  addQualification(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEmployeeQualificationDto,
  ) {
    return this.employeesService.addQualification(user, id, dto);
  }

  @Get('employees/:id/qualifications')
  @RequirePermission('EMPLOYEE_READ')
  getQualifications(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.getQualifications(user, id);
  }

  @Patch('employees/:id/qualifications/:qualId')
  @RequirePermission('EMPLOYEE_UPDATE')
  updateQualification(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qualId', ParseUUIDPipe) qualId: string,
    @Body() dto: UpdateEmployeeQualificationDto,
  ) {
    return this.employeesService.updateQualification(user, id, qualId, dto);
  }

  @Delete('employees/:id/qualifications/:qualId')
  @RequirePermission('EMPLOYEE_UPDATE')
  removeQualification(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('qualId', ParseUUIDPipe) qualId: string,
  ) {
    return this.employeesService.removeQualification(user, id, qualId);
  }

  // ==========================================
  // SALARY STRUCTURE ENDPOINTS
  // ==========================================

  @Get('employees/:id/salary-structures')
  @RequirePermission('EMPLOYEE_READ')
  getSalaryStructures(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.getSalaryStructures(user, id);
  }

  @Post('employees/:id/salary-structures')
  @RequirePermission('EMPLOYEE_UPDATE')
  createSalaryStructure(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateSalaryStructureDto,
  ) {
    return this.employeesService.createSalaryStructure(user, id, dto);
  }

  @Post('employees/:id/salary-structures/:structId/version')
  @RequirePermission('EMPLOYEE_UPDATE')
  reviseSalaryStructure(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('structId', ParseUUIDPipe) structId: string,
    @Body() dto: ReviseSalaryStructureDto,
  ) {
    return this.employeesService.reviseSalaryStructure(user, id, structId, dto);
  }

  @Get('employees/:id/vehicle-history')
  @RequirePermission('EMPLOYEE_READ')
  getEmployeeVehicleHistory(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.employeesService.getVehicleHistory(user, id);
  }
}
