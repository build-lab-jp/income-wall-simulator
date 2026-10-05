(function (root) {
    'use strict';

    function projectAnnualIncome(incomeToDate, monthsElapsed) {
        return Math.round(incomeToDate / monthsElapsed * 12);
    }

    function getPensionEligibleMonths({ ageAtYearEnd, birthMonth, birthdayIsFirst }) {
        let firstMonth = 1;
        let lastMonth = 12;
        if (ageAtYearEnd < 20 || ageAtYearEnd > 60) {
            lastMonth = 0;
        } else if (ageAtYearEnd === 20) {
            firstMonth = Math.max(1, birthdayIsFirst ? birthMonth - 1 : birthMonth);
        } else if (ageAtYearEnd === 60) {
            lastMonth = birthdayIsFirst ? birthMonth - 2 : birthMonth - 1;
        }
        return Array.from(
            { length: Math.max(0, lastMonth - firstMonth + 1) },
            (_, index) => firstMonth + index
        );
    }

    function calculateInsurance({
        gross,
        earnedIncome,
        ageAtYearEnd,
        ageGroup,
        birthMonth,
        birthdayIsFirst,
        taxYear,
        isHealthDependent,
        companyInsuranceMonths = [],
        isStudentExemption
    }) {
        const coveredMonths = new Set(companyInsuranceMonths);
        const uncoveredHealthMonths = 12 - coveredMonths.size;
        const employeeInsurance = Math.round((gross / 12) * 0.15 * coveredMonths.size);
        const dependentHealthLimit = ageGroup === '19_22' ? 1500000 : 1300000;
        const healthDependentLost = isHealthDependent && gross >= dependentHealthLimit;
        let nationalHealth = 0;
        if ((!isHealthDependent || healthDependentLost) && uncoveredHealthMonths > 0) {
            const annualNationalHealth = Math.max(30000, Math.round(Math.max(0, earnedIncome - 430000) * 0.08));
            nationalHealth = Math.round(annualNationalHealth * uncoveredHealthMonths / 12);
        }

        const eligiblePensionMonths = getPensionEligibleMonths({ ageAtYearEnd, birthMonth, birthdayIsFirst });
        const uncoveredPensionMonths = eligiblePensionMonths.filter(month => !coveredMonths.has(month));
        const pensionMonths = uncoveredPensionMonths.length;
        const monthlyRate = month => taxYear === '2025'
            ? (month <= 3 ? 16980 : 17510)
            : (month <= 3 ? 17510 : 17920);
        const nationalPension = isStudentExemption
            ? 0
            : uncoveredPensionMonths.reduce((sum, month) => sum + monthlyRate(month), 0);

        return {
            employeeInsurance,
            nationalHealth,
            nationalPension,
            pensionMonths,
            eligiblePensionMonths,
            uncoveredHealthMonths,
            healthDependentLost,
            dependentHealthLimit
        };
    }

    const api = { projectAnnualIncome, getPensionEligibleMonths, calculateInsurance };
    root.IncomeWallCalculations = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);