import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUserContext } from '../../common/decorators/current-user.decorator';
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
import {
  RecruitmentStatus,
  CandidateOfferStatus,
  InterviewResult,
  AuditAction,
  EmployeeStatus,
  Gender,
} from '@prisma/client';

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  private async generateCandidateCode(agencyId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.recruitmentCandidate.count({
      where: { agencyId },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `CAN-${year}-${seq}`;
  }

  // ==========================================
  // 1. CANDIDATE MANAGEMENT
  // ==========================================

  async createCandidate(dto: CreateCandidateDto, user: AuthenticatedUserContext) {
    const branchId = user.branchId || dto.branchId;
    if (!branchId) {
      throw new BadRequestException('Branch must be specified for candidate registration');
    }

    const candidateCode = await this.generateCandidateCode(user.agencyId);

    const candidate = await this.prisma.recruitmentCandidate.create({
      data: {
        agencyId: user.agencyId,
        branchId,
        candidateCode,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        alternatePhone: dto.alternatePhone || null,
        email: dto.email || null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender || Gender.OTHER,
        address: dto.address || null,
        primaryDesignationId: dto.primaryDesignationId,
        yearsOfExperience: dto.yearsOfExperience || 0,
        previousEmployer: dto.previousEmployer || null,
        skills: dto.skills || [],
        source: dto.source || 'WALK_IN',
        expectedSalary: dto.expectedSalary || null,
        availabilityDate: dto.availabilityDate ? new Date(dto.availabilityDate) : null,
        currentCity: dto.currentCity,
        status: RecruitmentStatus.APPLIED,
        notes: dto.notes || null,
      },
      include: {
        primaryDesignation: true,
        branch: true,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId,
      userId: user.id,
      entityName: 'RecruitmentCandidate',
      entityId: candidate.id,
      action: AuditAction.CREATE,
      changeSummary: `CANDIDATE_CREATED: Registered applicant ${dto.firstName} ${dto.lastName} (${candidateCode})`,
      newValues: {
        candidateCode,
        primaryDesignation: candidate.primaryDesignation?.name,
        source: candidate.source,
      },
    });

    return candidate;
  }

  async getCandidates(query: CandidateQueryDto, user: AuthenticatedUserContext) {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? query.limit : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      agencyId: user.agencyId,
      deletedAt: null,
    };

    if (user.branchId) {
      where.branchId = user.branchId;
    } else if (query.branchId) {
      where.branchId = query.branchId;
    }

    if (query.status) where.status = query.status;
    if (query.primaryDesignationId) where.primaryDesignationId = query.primaryDesignationId;

    if (query.search) {
      where.OR = [
        { candidateCode: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.recruitmentCandidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          primaryDesignation: true,
          branch: true,
          interviews: { orderBy: { scheduledAt: 'desc' } },
          offers: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      this.prisma.recruitmentCandidate.count({ where }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCandidateById(id: string, user: AuthenticatedUserContext) {
    const candidate = await this.prisma.recruitmentCandidate.findUnique({
      where: { id },
      include: {
        primaryDesignation: true,
        branch: true,
        screenedBy: { select: { id: true, fullName: true, email: true } },
        interviews: {
          include: { interviewer: { select: { id: true, fullName: true, email: true } } },
          orderBy: { scheduledAt: 'asc' },
        },
        offers: {
          include: { designation: true, branch: true },
          orderBy: { createdAt: 'desc' },
        },
        convertedEmployee: true,
      },
    });

    if (!candidate || candidate.agencyId !== user.agencyId || Boolean(candidate.deletedAt)) {
      throw new NotFoundException('Candidate not found');
    }

    if (user.branchId && candidate.branchId !== user.branchId) {
      throw new ForbiddenException('Candidate belongs to a different branch');
    }

    return candidate;
  }

  // ==========================================
  // 2. SCREENING & EVALUATION
  // ==========================================

  async screenCandidate(id: string, dto: ScreenCandidateDto, user: AuthenticatedUserContext) {
    const candidate = await this.getCandidateById(id, user);

    const updated = await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: {
        screeningNotes: dto.screeningNotes,
        screenedById: user.id,
        screenedAt: new Date(),
        status: dto.nextStage || RecruitmentStatus.SCREENING,
      },
      include: { primaryDesignation: true, branch: true },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: candidate.branchId,
      userId: user.id,
      entityName: 'RecruitmentCandidate',
      entityId: candidate.id,
      action: AuditAction.UPDATE,
      changeSummary: `CANDIDATE_SCREENED: Screened by ${user.email}. Stage transitioned to ${updated.status}`,
      newValues: {
        status: updated.status,
        screeningNotes: dto.screeningNotes,
      },
    });

    return updated;
  }

  async scheduleInterview(candidateId: string, dto: ScheduleInterviewDto, user: AuthenticatedUserContext) {
    const candidate = await this.getCandidateById(candidateId, user);

    const interview = await this.prisma.candidateInterview.create({
      data: {
        candidateId: candidate.id,
        interviewerUserId: dto.interviewerUserId,
        stageName: dto.stageName,
        scheduledAt: new Date(dto.scheduledAt),
        evaluationNotes: dto.evaluationNotes || null,
        result: InterviewResult.PENDING,
      },
      include: {
        interviewer: { select: { id: true, fullName: true, email: true } },
      },
    });

    await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: { status: RecruitmentStatus.INTERVIEW_SCHEDULED },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: candidate.branchId,
      userId: user.id,
      entityName: 'CandidateInterview',
      entityId: interview.id,
      action: AuditAction.CREATE,
      changeSummary: `INTERVIEW_SCHEDULED: Scheduled ${dto.stageName} for candidate ${candidate.candidateCode}`,
      newValues: {
        stageName: dto.stageName,
        scheduledAt: dto.scheduledAt,
      },
    });

    return interview;
  }

  async evaluateInterview(interviewId: string, dto: EvaluateInterviewDto, user: AuthenticatedUserContext) {
    const interview = await this.prisma.candidateInterview.findUnique({
      where: { id: interviewId },
      include: { candidate: true },
    });

    if (!interview || interview.candidate.agencyId !== user.agencyId) {
      throw new NotFoundException('Interview record not found');
    }

    const updated = await this.prisma.candidateInterview.update({
      where: { id: interviewId },
      data: {
        result: dto.result,
        score: dto.score || null,
        completedAt: new Date(),
        evaluationNotes: dto.evaluationNotes || interview.evaluationNotes,
      },
    });

    // If passed, candidate stage can move forward
    if (dto.result === InterviewResult.PASSED) {
      await this.prisma.recruitmentCandidate.update({
        where: { id: interview.candidateId },
        data: { status: RecruitmentStatus.SELECTED },
      });
    } else if (dto.result === InterviewResult.FAILED) {
      await this.prisma.recruitmentCandidate.update({
        where: { id: interview.candidateId },
        data: { status: RecruitmentStatus.REJECTED },
      });
    }

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: interview.candidate.branchId,
      userId: user.id,
      entityName: 'CandidateInterview',
      entityId: interview.id,
      action: AuditAction.UPDATE,
      changeSummary: `INTERVIEW_EVALUATED: Result ${dto.result} (Score: ${dto.score ?? 'N/A'})`,
      newValues: {
        result: dto.result,
        score: dto.score,
      },
    });

    return updated;
  }

  async evaluateSkillTest(candidateId: string, dto: EvaluateSkillTestDto, user: AuthenticatedUserContext) {
    const candidate = await this.getCandidateById(candidateId, user);

    const updated = await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: {
        skillTestScore: dto.score,
        skillTestNotes: dto.skillTestNotes,
        status: dto.nextStage || RecruitmentStatus.SKILL_TEST_PASSED,
      },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: candidate.branchId,
      userId: user.id,
      entityName: 'RecruitmentCandidate',
      entityId: candidate.id,
      action: AuditAction.UPDATE,
      changeSummary: `SKILL_TEST_EVALUATED: Score ${dto.score}/100. Status: ${updated.status}`,
      newValues: {
        score: dto.score,
        skillTestNotes: dto.skillTestNotes,
      },
    });

    return updated;
  }

  // ==========================================
  // 3. OFFER MANAGEMENT
  // ==========================================

  async createOffer(candidateId: string, dto: CreateOfferDto, user: AuthenticatedUserContext) {
    const candidate = await this.getCandidateById(candidateId, user);

    if (
      candidate.status === RecruitmentStatus.REJECTED ||
      candidate.status === RecruitmentStatus.HIRED
    ) {
      throw new BadRequestException(`Cannot create offer for candidate in status ${candidate.status}`);
    }

    const branchId = user.branchId || dto.branchId || candidate.branchId;

    const offer = await this.prisma.candidateOffer.create({
      data: {
        agencyId: user.agencyId,
        candidateId: candidate.id,
        designationId: dto.designationId,
        branchId,
        offeredSalary: dto.offeredSalary,
        joiningDate: new Date(dto.joiningDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        status: CandidateOfferStatus.SENT,
        notes: dto.notes || null,
      },
      include: {
        designation: true,
        branch: true,
      },
    });

    await this.prisma.recruitmentCandidate.update({
      where: { id: candidate.id },
      data: { status: RecruitmentStatus.OFFERED },
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId,
      userId: user.id,
      entityName: 'CandidateOffer',
      entityId: offer.id,
      action: AuditAction.CREATE,
      changeSummary: `OFFER_CREATED: Extended offer to ${candidate.candidateCode} for ${offer.designation.name} at ₹${dto.offeredSalary}/mo`,
      newValues: {
        offeredSalary: dto.offeredSalary,
        joiningDate: dto.joiningDate,
      },
    });

    return offer;
  }

  async updateOfferStatus(offerId: string, dto: UpdateOfferStatusDto, user: AuthenticatedUserContext) {
    const offer = await this.prisma.candidateOffer.findUnique({
      where: { id: offerId },
      include: { candidate: true },
    });

    if (!offer || offer.agencyId !== user.agencyId) {
      throw new NotFoundException('Offer not found');
    }

    const updated = await this.prisma.candidateOffer.update({
      where: { id: offerId },
      data: {
        status: dto.status,
        notes: dto.notes || offer.notes,
      },
    });

    if (dto.status === CandidateOfferStatus.ACCEPTED) {
      await this.prisma.recruitmentCandidate.update({
        where: { id: offer.candidateId },
        data: { status: RecruitmentStatus.SELECTED },
      });
    } else if (dto.status === CandidateOfferStatus.DECLINED) {
      await this.prisma.recruitmentCandidate.update({
        where: { id: offer.candidateId },
        data: { status: RecruitmentStatus.REJECTED },
      });
    }

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: offer.branchId,
      userId: user.id,
      entityName: 'CandidateOffer',
      entityId: offer.id,
      action: AuditAction.UPDATE,
      changeSummary: `OFFER_STATUS_UPDATED: Offer status transitioned to ${dto.status}`,
      newValues: { status: dto.status },
    });

    return updated;
  }

  // ==========================================
  // 4. ATOMIC CANDIDATE -> EMPLOYEE CONVERSION
  // ==========================================

  async convertToEmployee(candidateId: string, dto: ConvertCandidateToEmployeeDto, user: AuthenticatedUserContext) {
    const candidate = await this.getCandidateById(candidateId, user);

    // Guard against duplicate conversion
    if (candidate.convertedToEmployeeId) {
      throw new BadRequestException('CANDIDATE_ALREADY_CONVERTED: This candidate has already been hired and converted to an employee');
    }

    const hasAcceptedOffer = candidate.offers?.some((o: any) => o.status === CandidateOfferStatus.ACCEPTED);
    if (!hasAcceptedOffer && candidate.status !== RecruitmentStatus.SELECTED) {
      throw new BadRequestException('CANDIDATE_OFFER_NOT_ACCEPTED: Cannot convert candidate without an accepted offer');
    }

    const branch = await this.prisma.agencyBranch.findUnique({
      where: { id: candidate.branchId },
    });

    // Generate unique employee code
    let employeeCode = dto.employeeCodeOverride;
    if (!employeeCode) {
      const empCount = await this.prisma.employee.count({
        where: { agencyId: user.agencyId },
      });
      const branchPrefix = branch?.branchCode || 'EMP';
      employeeCode = `${branchPrefix}-EMP-${String(empCount + 1).padStart(4, '0')}`;
    }

    const employee = await this.prisma.$transaction(async (tx) => {
      // 1. Create Authoritative Employee
      const emp = await tx.employee.create({
        data: {
          agencyId: user.agencyId,
          branchId: candidate.branchId,
          employeeCode,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          phone: candidate.phone,
          email: candidate.email || `${employeeCode.toLowerCase()}@apexmanpower.com`,
          gender: candidate.gender || Gender.OTHER,
          dateOfBirth: candidate.dateOfBirth || new Date('1995-01-01'),
          dateOfJoining: new Date(dto.dateOfJoining),
          primaryDesignationId: candidate.primaryDesignationId,
          status: EmployeeStatus.ACTIVE,
          currentAddress: candidate.address || 'Address on file',
          permanentAddress: candidate.address || 'Address on file',
          emergencyContactName: 'Emergency Contact',
          emergencyContactPhone: candidate.phone,
          bankName: dto.bankName || 'HDFC Bank',
          bankBranch: 'Main Branch',
          bankAccountNoEncrypted: dto.bankAccountNo ? `ENC_${dto.bankAccountNo}` : 'ENC_DEFAULT',
          bankAccountNoMasked: dto.bankAccountNo ? `XXXXXX${dto.bankAccountNo.slice(-4)}` : 'XXXXXX1234',
          bankIfsc: dto.bankIfsc || 'HDFC0001234',
          aadhaarEncrypted: 'ENC_AADHAAR',
          aadhaarMasked: 'XXXXXXXX1234',
          recruitedCandidateId: candidate.id,
        },
      });

      // 2. Create Initial Salary Structure
      await tx.employeeSalaryStructure.create({
        data: {
          employeeId: emp.id,
          effectiveFrom: new Date(dto.dateOfJoining),
          basicPay: dto.basicPay,
          dearnessAllowance: dto.dearnessAllowance || 0.0,
          houseRentAllowance: dto.houseRentAllowance || 0.0,
          conveyanceAllowance: dto.conveyanceAllowance || 0.0,
          specialAllowance: dto.specialAllowance || 0.0,
          overtimeRatePerHour: Number(((dto.basicPay / 240) * 1.5).toFixed(2)),
          pfApplicable: true,
          esiApplicable: dto.basicPay <= 21000,
          ptApplicable: true,
          lwfApplicable: true,
        },
      });

      // 3. Mark Candidate HIRED with permanent linkage
      await tx.recruitmentCandidate.update({
        where: { id: candidate.id },
        data: {
          status: RecruitmentStatus.HIRED,
          convertedToEmployeeId: emp.id,
          hiredAt: new Date(),
        },
      });

      return emp;
    });

    await this.auditService.record({
      agencyId: user.agencyId,
      branchId: candidate.branchId,
      userId: user.id,
      entityName: 'RecruitmentCandidate',
      entityId: candidate.id,
      action: AuditAction.APPROVE,
      changeSummary: `CANDIDATE_CONVERTED: Successfully onboarded candidate ${candidate.candidateCode} as Employee ${employeeCode}`,
      newValues: {
        employeeId: employee.id,
        employeeCode,
        hiredAt: new Date(),
      },
    });

    return employee;
  }
}
