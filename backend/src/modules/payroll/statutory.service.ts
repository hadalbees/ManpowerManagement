import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  StatutoryRule,
  StatutoryRuleType,
  StatutoryCalcMethod,
  RoundingMethod,
} from '@prisma/client';

export interface StatutoryCalculationResult {
  epfEmployee: number;
  epfEmployer: number;
  epfEpsEmployer: number;
  esicEmployee: number;
  esicEmployer: number;
  professionalTax: number;
  lwfEmployee: number;
  lwfEmployer: number;
  snapshot: Record<string, any>;
}

@Injectable()
export class StatutoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Applies configured rounding method to calculated currency amounts
   */
  applyRounding(amount: number, method: RoundingMethod = RoundingMethod.NEAREST_INTEGER): number {
    switch (method) {
      case RoundingMethod.NEAREST_INTEGER:
        return Math.round(amount);
      case RoundingMethod.ROUND_UP:
        return Math.ceil(amount);
      case RoundingMethod.ROUND_DOWN:
        return Math.floor(amount);
      case RoundingMethod.EXACT:
      default:
        return Number(amount.toFixed(2));
    }
  }

  /**
   * Resolves active and effective statutory rules for an agency and optional state code
   */
  async resolveRulesForPeriod(
    agencyId: string,
    stateCode: string | null,
    businessDate: Date,
  ): Promise<{
    epfRule: StatutoryRule | null;
    esicRule: StatutoryRule | null;
    ptRule: StatutoryRule | null;
    lwfRule: StatutoryRule | null;
  }> {
    const rules = await this.prisma.statutoryRule.findMany({
      where: {
        agencyId,
        isActive: true,
        effectiveFrom: { lte: businessDate },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: businessDate } }],
      },
      orderBy: { effectiveFrom: 'desc' },
    });

    const epfRule = rules.find((r) => r.ruleType === StatutoryRuleType.EPF) || null;
    const esicRule = rules.find((r) => r.ruleType === StatutoryRuleType.ESIC) || null;
    const ptRule =
      rules.find((r) => r.ruleType === StatutoryRuleType.PROFESSIONAL_TAX && (stateCode ? r.stateCode === stateCode : true)) ||
      rules.find((r) => r.ruleType === StatutoryRuleType.PROFESSIONAL_TAX && r.stateCode === null) ||
      null;
    const lwfRule =
      rules.find((r) => r.ruleType === StatutoryRuleType.LWF && (stateCode ? r.stateCode === stateCode : true)) ||
      rules.find((r) => r.ruleType === StatutoryRuleType.LWF && r.stateCode === null) ||
      null;

    return { epfRule, esicRule, ptRule, lwfRule };
  }

  /**
   * Calculates comprehensive statutory deductions and employer contributions for an employee
   */
  calculateStatutories(params: {
    basicEarned: number;
    daEarned: number;
    grossSalary: number;
    pfApplicable: boolean;
    esiApplicable: boolean;
    ptApplicable: boolean;
    lwfApplicable: boolean;
    stateCode?: string | null;
    epfRule: StatutoryRule | null;
    esicRule: StatutoryRule | null;
    ptRule: StatutoryRule | null;
    lwfRule: StatutoryRule | null;
  }): StatutoryCalculationResult {
    const {
      basicEarned,
      daEarned,
      grossSalary,
      pfApplicable,
      esiApplicable,
      ptApplicable,
      lwfApplicable,
      epfRule,
      esicRule,
      ptRule,
      lwfRule,
    } = params;

    let epfEmployee = 0;
    let epfEmployer = 0;
    let epfEpsEmployer = 0;

    let esicEmployee = 0;
    let esicEmployer = 0;

    let professionalTax = 0;
    let lwfEmployee = 0;
    let lwfEmployer = 0;

    const snapshot: Record<string, any> = {
      epf: null,
      esic: null,
      pt: null,
      lwf: null,
    };

    // 1. EPF (Employees' Provident Fund)
    if (pfApplicable && epfRule) {
      const basicDa = basicEarned + daEarned;
      const config = (epfRule.ruleConfig as any) || {};
      const ceiling = epfRule.wageCeiling !== null && epfRule.wageCeiling !== undefined
        ? Number(epfRule.wageCeiling)
        : (config?.wage_ceiling !== undefined ? Number(config.wage_ceiling) : null);
      const epfBasis = ceiling !== null && basicDa > ceiling ? ceiling : basicDa;

      const empPct = Number(epfRule.employeeContributionPct);
      const emplyrPct = Number(epfRule.employerContributionPct);

      epfEmployee = this.applyRounding((epfBasis * empPct) / 100, epfRule.roundingMethod);

      // Breakdown: EPS resolved strictly from ruleConfig; if not configured, EPS is 0
      const epsPct = config?.statutory_breakdown?.employer_eps_ac10_pct !== undefined
        ? Number(config.statutory_breakdown.employer_eps_ac10_pct)
        : (config?.employer_eps_pct !== undefined ? Number(config.employer_eps_pct) : 0);

      const maxEpsCeiling = config?.max_statutory_eps_wage_ceiling !== undefined
        ? Number(config.max_statutory_eps_wage_ceiling)
        : ceiling;

      const epsBasis = maxEpsCeiling !== null && basicDa > maxEpsCeiling ? maxEpsCeiling : basicDa;

      if (epsPct > 0) {
        epfEpsEmployer = this.applyRounding((epsBasis * epsPct) / 100, epfRule.roundingMethod);
      } else {
        epfEpsEmployer = 0;
      }

      const totalEmployerEpf = this.applyRounding((epfBasis * emplyrPct) / 100, epfRule.roundingMethod);
      epfEmployer = Math.max(0, totalEmployerEpf - epfEpsEmployer);

      snapshot.epf = {
        ruleCode: 'EPF',
        ruleId: epfRule.id,
        effectiveFrom: epfRule.effectiveFrom,
        effectiveTo: epfRule.effectiveTo,
        rate: {
          employeeRate: empPct,
          employerTotalRate: emplyrPct,
          epsRate: epsPct,
        },
        wageCeiling: ceiling,
        epsCeiling: maxEpsCeiling,
        applicability: {
          pfApplicable,
          eligible: true,
        },
        calculationBasis: epfRule.calculationMethod,
        roundingMethod: epfRule.roundingMethod,
        wageBasis: epfBasis,
        employeeDeduction: epfEmployee,
        employerEpfContribution: epfEmployer,
        employerEpsContribution: epfEpsEmployer,
      };
    }

    // 2. ESIC (Employees' State Insurance Corporation)
    if (esiApplicable && esicRule) {
      const config = (esicRule.ruleConfig as any) || {};
      const ceiling = esicRule.wageCeiling !== null && esicRule.wageCeiling !== undefined
        ? Number(esicRule.wageCeiling)
        : (config?.wage_ceiling !== undefined ? Number(config.wage_ceiling) : null);

      const empPct = Number(esicRule.employeeContributionPct);
      const emplyrPct = Number(esicRule.employerContributionPct);

      const isEligible = (ceiling === null || grossSalary <= ceiling) && grossSalary > 0;

      if (isEligible) {
        esicEmployee = this.applyRounding((grossSalary * empPct) / 100, esicRule.roundingMethod);
        esicEmployer = this.applyRounding((grossSalary * emplyrPct) / 100, esicRule.roundingMethod);

        snapshot.esic = {
          ruleCode: 'ESIC',
          ruleId: esicRule.id,
          effectiveFrom: esicRule.effectiveFrom,
          effectiveTo: esicRule.effectiveTo,
          rate: {
            employeeRate: empPct,
            employerRate: emplyrPct,
          },
          wageCeiling: ceiling,
          applicability: {
            esiApplicable,
            eligible: true,
            isExempt: false,
          },
          calculationBasis: esicRule.calculationMethod,
          roundingMethod: esicRule.roundingMethod,
          wageBasis: grossSalary,
          employeeDeduction: esicEmployee,
          employerContribution: esicEmployer,
        };
      } else {
        snapshot.esic = {
          ruleCode: 'ESIC',
          ruleId: esicRule.id,
          effectiveFrom: esicRule.effectiveFrom,
          effectiveTo: esicRule.effectiveTo,
          rate: {
            employeeRate: empPct,
            employerRate: emplyrPct,
          },
          wageCeiling: ceiling,
          applicability: {
            esiApplicable,
            eligible: false,
            isExempt: ceiling !== null && grossSalary > ceiling,
          },
          calculationBasis: esicRule.calculationMethod,
          roundingMethod: esicRule.roundingMethod,
          wageBasis: grossSalary,
          employeeDeduction: 0,
          employerContribution: 0,
          reason: ceiling !== null && grossSalary > ceiling
            ? 'Gross salary exceeds configured statutory wage ceiling'
            : 'Zero gross wages',
        };
      }
    }

    // 3. Professional Tax (PT)
    if (ptApplicable && ptRule) {
      const config = (ptRule.ruleConfig as any) || {};
      let matchedSlab: any = null;

      if (config?.half_yearly_slabs && Array.isArray(config.half_yearly_slabs)) {
        // Half-yearly slab logic: annualized/half-year gross = grossSalary * 6
        const halfYearGross = grossSalary * 6;
        const slab = config.half_yearly_slabs.find(
          (s: any) => halfYearGross >= s.min_half_year_gross && halfYearGross <= s.max_half_year_gross,
        );
        if (slab) {
          matchedSlab = slab;
          if (slab.half_yearly_tax > 0) {
            professionalTax = this.applyRounding(slab.half_yearly_tax / 6, ptRule.roundingMethod);
          }
        }
      } else if (config?.monthly_slabs && Array.isArray(config.monthly_slabs)) {
        const slab = config.monthly_slabs.find(
          (s: any) => grossSalary >= s.min_gross && grossSalary <= s.max_gross,
        );
        if (slab) {
          matchedSlab = slab;
          if (slab.tax > 0) {
            professionalTax = this.applyRounding(slab.tax, ptRule.roundingMethod);
          }
        }
      } else if (ptRule.employeeContributionPct && Number(ptRule.employeeContributionPct) > 0) {
        professionalTax = this.applyRounding(
          (grossSalary * Number(ptRule.employeeContributionPct)) / 100,
          ptRule.roundingMethod,
        );
      }

      snapshot.pt = {
        ruleCode: 'PROFESSIONAL_TAX',
        ruleId: ptRule.id,
        effectiveFrom: ptRule.effectiveFrom,
        effectiveTo: ptRule.effectiveTo,
        stateCode: ptRule.stateCode,
        calculationBasis: ptRule.calculationMethod,
        roundingMethod: ptRule.roundingMethod,
        grossSalary,
        matchedSlab,
        deduction: professionalTax,
      };
    }

    // 4. Labour Welfare Fund (LWF)
    if (lwfApplicable && lwfRule) {
      const config = (lwfRule.ruleConfig as any) || {};
      const empFixed = config?.employee_fixed_amount !== undefined
        ? Number(config.employee_fixed_amount)
        : (lwfRule.employeeContributionPct ? Number(lwfRule.employeeContributionPct) : 0);
      const emplyrFixed = config?.employer_fixed_amount !== undefined
        ? Number(config.employer_fixed_amount)
        : (lwfRule.employerContributionPct ? Number(lwfRule.employerContributionPct) : 0);

      lwfEmployee = this.applyRounding(empFixed, lwfRule.roundingMethod);
      lwfEmployer = this.applyRounding(emplyrFixed, lwfRule.roundingMethod);

      snapshot.lwf = {
        ruleCode: 'LWF',
        ruleId: lwfRule.id,
        effectiveFrom: lwfRule.effectiveFrom,
        effectiveTo: lwfRule.effectiveTo,
        stateCode: lwfRule.stateCode,
        calculationBasis: lwfRule.calculationMethod,
        roundingMethod: lwfRule.roundingMethod,
        employeeContribution: lwfEmployee,
        employerContribution: lwfEmployer,
      };
    }

    return {
      epfEmployee,
      epfEmployer,
      epfEpsEmployer,
      esicEmployee,
      esicEmployer,
      professionalTax,
      lwfEmployee,
      lwfEmployer,
      snapshot,
    };
  }
}
