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
import { ReplacementsService } from './replacements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateReplacementDto,
  UpdateReplacementDto,
  ApproveReplacementDto,
  RejectReplacementDto,
  CancelReplacementDto,
  CompleteReplacementDto,
  ReplacementQueryDto,
} from './dto/replacements.dto';

@Controller('replacements')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class ReplacementsController {
  constructor(private readonly replacementsService: ReplacementsService) {}

  @Post()
  @RequirePermission('REPLACEMENT_CREATE')
  async createReplacement(
    @Body() dto: CreateReplacementDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.createReplacement(dto, user);
  }

  @Get()
  @RequirePermission('REPLACEMENT_READ')
  async getReplacements(
    @Query() query: ReplacementQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.getReplacements(query, user);
  }

  @Get(':id')
  @RequirePermission('REPLACEMENT_READ')
  async getReplacementById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.getReplacementById(id, user);
  }

  @Patch(':id')
  @RequirePermission('REPLACEMENT_UPDATE')
  async updateReplacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReplacementDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.updateReplacement(id, dto, user);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('REPLACEMENT_APPROVE')
  async approveReplacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApproveReplacementDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.approveReplacement(id, dto, user);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('REPLACEMENT_REJECT')
  async rejectReplacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectReplacementDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.rejectReplacement(id, dto, user);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('REPLACEMENT_CANCEL')
  async cancelReplacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReplacementDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.cancelReplacement(id, dto, user);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('REPLACEMENT_COMPLETE')
  async completeReplacement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteReplacementDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.replacementsService.completeReplacement(id, dto, user);
  }
}
