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

    function employmentDeduction(gross, taxYear) {
        if (taxYear === '2026') {
            if (gross >= 2191000 && gross < 2193000) return gross - 1451000;
            if (gross >= 2193000 && gross < 2196000) return gross - 1453000;
            if (gross >= 2196000 && gross < 2200000) return gross - 1456000;
            if (gross <= 2200000) return Math.min(gross, 740000);
        } else if (gross <= 1900000) {
            return Math.min(gross, 650000);
        }

        if (gross <= 3600000) return gross * 0.30 + 80000;
        if (gross <= 6600000) return gross * 0.20 + 440000;
        if (gross <= 8500000) return gross * 0.10 + 1100000;
        return 1950000;
    }

    function calculateEarnedIncome(gross, taxYear) {
        const salaryDeduction = employmentDeduction(gross, taxYear);
        return { salaryDeduction, earnedIncome: Math.max(0, gross - salaryDeduction) };
    }

    function basicDeduction(earnedIncome, taxYear) {
        if (taxYear === '2025') {
            if (earnedIncome <= 1320000) return 950000;
            if (earnedIncome <= 3360000) return 880000;
            if (earnedIncome <= 4890000) return 680000;
            if (earnedIncome <= 6550000) return 630000;
            if (earnedIncome <= 23500000) return 580000;
            if (earnedIncome <= 24000000) return 480000;
            if (earnedIncome <= 24500000) return 320000;
            if (earnedIncome <= 25000000) return 160000;
            return 0;
        }
        if (earnedIncome <= 4890000) return 1040000;
        if (earnedIncome <= 6550000) return 670000;
        if (earnedIncome <= 23500000) return 620000;
        if (earnedIncome <= 24000000) return 480000;
        if (earnedIncome <= 24500000) return 320000;
        if (earnedIncome <= 25000000) return 160000;
        return 0;
    }

    function incomeTaxFromTaxable(taxable) {
        const roundedTaxable = Math.floor(Math.max(0, taxable) / 1000) * 1000;
        let tax;
        if (roundedTaxable <= 1950000) tax = roundedTaxable * 0.05;
        else if (roundedTaxable <= 3300000) tax = roundedTaxable * 0.10 - 97500;
        else if (roundedTaxable <= 6950000) tax = roundedTaxable * 0.20 - 427500;
        else if (roundedTaxable <= 9000000) tax = roundedTaxable * 0.23 - 636000;
        else if (roundedTaxable <= 18000000) tax = roundedTaxable * 0.33 - 1536000;
        else if (roundedTaxable <= 40000000) tax = roundedTaxable * 0.40 - 2796000;
        else tax = roundedTaxable * 0.45 - 4796000;
        return Math.floor((Math.max(0, tax) * 1021) / 1000);
    }

    function calculatePersonalTax({ earnedIncome, taxYear, isWorkStudent, insuranceTotal }) {
        const standardBasicDeduction = basicDeduction(earnedIncome, taxYear);
        const workStudentLimit = taxYear === '2025' ? 850000 : 890000;
        const workStudentDeduction = isWorkStudent && earnedIncome <= workStudentLimit ? 270000 : 0;
        const taxableIncome = Math.max(0, earnedIncome - standardBasicDeduction - workStudentDeduction - insuranceTotal);
        return {
            standardBasicDeduction,
            workStudentDeduction,
            taxableIncome,
            incomeTax: incomeTaxFromTaxable(taxableIncome)
        };
    }

    function calculateParentDeduction(gross, { isTaxDependent, ageGroup, taxYear }) {
        if (!isTaxDependent || ageGroup === 'under16') return 0;

        const dependentIncomeLimit = taxYear === '2025' ? 1230000 : 1360000;
        if (ageGroup === '19_22') {
            if (taxYear === '2025') {
                if (gross <= 1500000) return 630000;
                if (gross <= 1550000) return 610000;
                if (gross <= 1600000) return 510000;
                if (gross <= 1650000) return 410000;
                if (gross <= 1700000) return 310000;
                if (gross <= 1750000) return 210000;
                if (gross <= 1800000) return 110000;
                if (gross <= 1850000) return 60000;
                if (gross <= 1880000) return 30000;
                return 0;
            }
            if (gross <= 1590000) return 630000;
            if (gross <= 1640000) return 610000;
            if (gross <= 1690000) return 510000;
            if (gross <= 1740000) return 410000;
            if (gross <= 1790000) return 310000;
            if (gross <= 1840000) return 210000;
            if (gross <= 1890000) return 110000;
            if (gross <= 1940000) return 60000;
            if (gross <= 1970000) return 30000;
            return 0;
        }
        if (gross > dependentIncomeLimit) return 0;
        if (ageGroup === '70plus') return 480000;
        return 380000;
    }

    function estimateParentIncomeTaxIncrease(deductionLoss, parentTaxRate) {
        return Math.round(deductionLoss * parentTaxRate * 1.021);
    }

    const api = {
        projectAnnualIncome,
        getPensionEligibleMonths,
        calculateInsurance,
        calculateEarnedIncome,
        basicDeduction,
        incomeTaxFromTaxable,
        calculatePersonalTax,
        calculateParentDeduction,
        estimateParentIncomeTaxIncrease
    };
    root.IncomeWallCalculations = api;
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);