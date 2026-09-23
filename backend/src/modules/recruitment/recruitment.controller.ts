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
import { RecruitmentService } from './recruitment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AgencyBranchContextGuard } from '../../common/guards/agency-branch-context.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser, AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
import {
  CreateCandidateDto,
  ScreenCandidateDto,
  ScheduleInterviewDto,
  EvaluateInterviewDto,
  EvaluateSkillTestDto,
  CreateOfferDto,
  UpdateOfferStatusDto,
  ConvertCandidateToEmployeeDto,
  CandidateQueryDto,
} from './dto/recruitment.dto';

@Controller('recruitment')
@UseGuards(JwtAuthGuard, AgencyBranchContextGuard, PermissionsGuard)
export class RecruitmentController {
  constructor(private readonly recruitmentService: RecruitmentService) {}

  @Post('candidates')
  @RequirePermission('RECRUITMENT_CREATE')
  async createCandidate(
    @Body() dto: CreateCandidateDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.createCandidate(dto, user);
  }

  @Get('candidates')
  @RequirePermission('RECRUITMENT_READ')
  async getCandidates(
    @Query() query: CandidateQueryDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.getCandidates(query, user);
  }

  @Get('candidates/:id')
  @RequirePermission('RECRUITMENT_READ')
  async getCandidateById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.getCandidateById(id, user);
  }

  @Post('candidates/:id/screen')
  @RequirePermission('RECRUITMENT_UPDATE')
  async screenCandidate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScreenCandidateDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.screenCandidate(id, dto, user);
  }

  @Post('candidates/:id/interviews')
  @RequirePermission('INTERVIEW_CREATE')
  async scheduleInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ScheduleInterviewDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.scheduleInterview(id, dto, user);
  }

  @Post('interviews/:id/evaluate')
  @RequirePermission('INTERVIEW_UPDATE')
  async evaluateInterview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EvaluateInterviewDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.evaluateInterview(id, dto, user);
  }

  @Post('candidates/:id/skill-test')
  @RequirePermission('RECRUITMENT_UPDATE')
  async evaluateSkillTest(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EvaluateSkillTestDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.evaluateSkillTest(id, dto, user);
  }

  @Post('candidates/:id/offers')
  @RequirePermission('RECRUITMENT_APPROVE')
  async createOffer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOfferDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.createOffer(id, dto, user);
  }

  @Patch('offers/:id')
  @RequirePermission('RECRUITMENT_APPROVE')
  async updateOfferStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOfferStatusDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.updateOfferStatus(id, dto, user);
  }

  @Post('candidates/:id/convert')
  @RequirePermission('RECRUITMENT_CONVERT')
  async convertToEmployee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ConvertCandidateToEmployeeDto,
    @CurrentUser() user: AuthenticatedUserContext,
  ) {
    return this.recruitmentService.convertToEmployee(id, dto, user);
  }
}
