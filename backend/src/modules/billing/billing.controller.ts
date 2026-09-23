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
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  GenerateInvoiceDto,
  UpdateInvoiceDto,
  CreateInvoiceAdjustmentDto,
  RecordClientPaymentDto,
  InvoiceQueryDto,
  PaymentQueryDto,
} from './dto/billing.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ==========================================
  // 1. INVOICES
  // ==========================================

  @Post('invoices')
  @RequirePermission('INVOICE_CREATE')
  async generateInvoice(
    @Body() dto: GenerateInvoiceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.generateInvoice(dto, user);
  }

  @Get('invoices')
  @RequirePermission('INVOICE_READ')
  async getInvoices(
    @Query() query: InvoiceQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.getInvoices(query, user);
  }

  @Get('invoices/:id')
  @RequirePermission('INVOICE_READ')
  async getInvoiceById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.getInvoiceById(id, user);
  }

  @Patch('invoices/:id')
  @RequirePermission('INVOICE_UPDATE')
  async updateInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvoiceDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.updateInvoice(id, dto, user);
  }

  @Post('invoices/:id/finalize')
  @RequirePermission('INVOICE_FINALIZE')
  async finalizeInvoice(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.finalizeInvoice(id, user);
  }

  // ==========================================
  // 2. ADJUSTMENTS (Credit/Debit Notes)
  // ==========================================

  @Post('adjustments')
  @RequirePermission('ADJUSTMENT_CREATE')
  async createAdjustment(
    @Body() dto: CreateInvoiceAdjustmentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.createAdjustment(dto, user);
  }

  // ==========================================
  // 3. PAYMENTS & RECEIVABLES
  // ==========================================

  @Post('payments')
  @RequirePermission('PAYMENT_CREATE')
  async recordPayment(
    @Body() dto: RecordClientPaymentDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.recordPayment(dto, user);
  }

  @Get('payments')
  @RequirePermission('PAYMENT_READ')
  async getPayments(
    @Query() query: PaymentQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.billingService.getPayments(query, user);
  }
}
