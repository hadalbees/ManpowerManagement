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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  UpdateClientDto,
  UpdateClientStatusDto,
  ClientQueryDto,
} from './dto/client.dto';
import {
  CreateClientSiteDto,
  UpdateClientSiteDto,
} from './dto/client-site.dto';
import {
  CreateClientContractDto,
  UpdateClientContractDto,
} from './dto/client-contract.dto';
import {
  CreateClientBillingRateDto,
  CreateRateVersionDto,
  UpdateClientBillingRateDto,
} from './dto/client-billing-rate.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';

@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard, AgencyBranchContextGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  // ==========================================
  // CLIENT MASTER ENDPOINTS
  // ==========================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('CLIENT', 'CREATE')
  async createClient(
    @CurrentUser() user: AuthenticatedUserContext,
    @Body() dto: CreateClientDto,
  ) {
    return this.clientsService.createClient(user, dto);
  }

  @Get()
  @RequirePermission('CLIENT', 'READ')
  async findAllClients(
    @CurrentUser() user: AuthenticatedUserContext,
    @Query() query: ClientQueryDto,
  ) {
    return this.clientsService.findAllClients(user, query);
  }

  @Get(':id')
  @RequirePermission('CLIENT', 'READ')
  async findClientById(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id') id: string,
  ) {
    return this.clientsService.findClientById(user, id);
  }

  @Patch(':id')
  @RequirePermission('CLIENT', 'UPDATE')
  async updateClient(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clientsService.updateClient(user, id, dto);
  }

  @Patch(':id/status')
  @RequirePermission('CLIENT', 'UPDATE')
  async updateClientStatus(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id') id: string,
    @Body() dto: UpdateClientStatusDto,
  ) {
    return this.clientsService.updateClientStatus(user, id, dto.status);
  }

  @Delete(':id')
  @RequirePermission('CLIENT', 'DELETE')
  async softDeleteClient(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('id') id: string,
  ) {
    return this.clientsService.softDeleteClient(user, id);
  }

  // ==========================================
  // CLIENT SITE ENDPOINTS
  // ==========================================

  @Post(':clientId/sites')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('CLIENT', 'CREATE')
  async createSite(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientSiteDto,
  ) {
    return this.clientsService.createSite(user, clientId, dto);
  }

  @Get(':clientId/sites')
  @RequirePermission('CLIENT', 'READ')
  async findSitesByClient(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
  ) {
    return this.clientsService.findSitesByClient(user, clientId);
  }

  @Get(':clientId/sites/:siteId')
  @RequirePermission('CLIENT', 'READ')
  async findSiteById(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.clientsService.findSiteById(user, clientId, siteId);
  }

  @Patch(':clientId/sites/:siteId')
  @RequirePermission('CLIENT', 'UPDATE')
  async updateSite(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Param('siteId') siteId: string,
    @Body() dto: UpdateClientSiteDto,
  ) {
    return this.clientsService.updateSite(user, clientId, siteId, dto);
  }

  @Delete(':clientId/sites/:siteId')
  @RequirePermission('CLIENT', 'DELETE')
  async deleteSite(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Param('siteId') siteId: string,
  ) {
    return this.clientsService.deleteSite(user, clientId, siteId);
  }

  // ==========================================
  // CLIENT CONTRACT ENDPOINTS
  // ==========================================

  @Post(':clientId/contracts')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('CLIENT', 'CREATE')
  async createContract(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientContractDto,
  ) {
    return this.clientsService.createContract(user, clientId, dto);
  }

  @Get(':clientId/contracts')
  @RequirePermission('CLIENT', 'READ')
  async findContractsByClient(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
  ) {
    return this.clientsService.findContractsByClient(user, clientId);
  }

  @Patch(':clientId/contracts/:contractId')
  @RequirePermission('CLIENT', 'UPDATE')
  async updateContract(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Param('contractId') contractId: string,
    @Body() dto: UpdateClientContractDto,
  ) {
    return this.clientsService.updateContract(user, clientId, contractId, dto);
  }

  // ==========================================
  // CLIENT BILLING RATE ENDPOINTS
  // ==========================================

  @Post(':clientId/rates')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('CLIENT', 'CREATE')
  async createBillingRate(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Body() dto: CreateClientBillingRateDto,
  ) {
    return this.clientsService.createBillingRate(user, clientId, dto);
  }

  @Get(':clientId/rates')
  @RequirePermission('CLIENT', 'READ')
  async findBillingRatesByClient(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
  ) {
    return this.clientsService.findBillingRatesByClient(user, clientId);
  }

  @Post(':clientId/rates/:rateId/version')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('CLIENT', 'UPDATE')
  async createNewRateVersion(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Param('rateId') rateId: string,
    @Body() dto: CreateRateVersionDto,
  ) {
    return this.clientsService.createNewRateVersion(user, clientId, rateId, dto);
  }

  @Patch(':clientId/rates/:rateId/deactivate')
  @RequirePermission('CLIENT', 'UPDATE')
  async deactivateBillingRate(
    @CurrentUser() user: AuthenticatedUserContext,
    @Param('clientId') clientId: string,
    @Param('rateId') rateId: string,
    @Body() dto: UpdateClientBillingRateDto,
  ) {
    return this.clientsService.deactivateBillingRate(user, clientId, rateId, dto);
  }
}
