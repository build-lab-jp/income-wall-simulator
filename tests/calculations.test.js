const test = require('node:test');
const assert = require('node:assert/strict');
const { projectAnnualIncome, getPensionEligibleMonths, calculateInsurance, calculateEarnedIncome, basicDeduction, incomeTaxFromTaxable, calculatePersonalTax, calculateParentDeduction, estimateParentIncomeTaxIncrease } = require('../calculations.js');

const baseInput = {
    gross: 1200000,
    earnedIncome: 460000,
    ageAtYearEnd: 21,
    ageGroup: '19_22',
    birthMonth: 6,
    birthdayIsFirst: false,
    taxYear: '2026',
    isHealthDependent: false,
    companyInsuranceMonths: [],
    isStudentExemption: false
};

test('年収予測は給与累計を受取月数で12か月換算する', () => {
    assert.equal(projectAnnualIncome(500000, 5), 1200000);
});

test('勤務先保険なしなら国保12か月と国民年金12か月を概算する', () => {
    const result = calculateInsurance(baseInput);
    assert.equal(result.employeeInsurance, 0);
    assert.equal(result.nationalHealth, 30000);
    assert.equal(result.pensionMonths, 12);
    assert.equal(result.nationalPension, 213810);
});

test('勤務先保険6か月なら保険料・国保・国民年金を加入月数で分ける', () => {
    const result = calculateInsurance({
        ...baseInput,
        gross: 2000000,
        earnedIncome: 1260000,
        ageAtYearEnd: 20,
        isHealthDependent: true,
        companyInsuranceMonths: [1, 2, 3, 4, 5, 6]
    });
    assert.equal(result.employeeInsurance, 150000);
    assert.equal(result.nationalHealth, 33200);
    assert.equal(result.pensionMonths, 6);
    assert.equal(result.nationalPension, 107520);
});

test('勤務先保険12か月なら国保・国民年金を別に計上しない', () => {
    const result = calculateInsurance({
        ...baseInput,
        companyInsuranceMonths: Array.from({ length: 12 }, (_, index) => index + 1)
    });
    assert.equal(result.employeeInsurance, 180000);
    assert.equal(result.nationalHealth, 0);
    assert.equal(result.pensionMonths, 0);
    assert.equal(result.nationalPension, 0);
});

test('20歳になる年は誕生日が1日かどうかで対象開始月が変わる', () => {
    assert.deepEqual(getPensionEligibleMonths({ ageAtYearEnd: 20, birthMonth: 5, birthdayIsFirst: false }), [5, 6, 7, 8, 9, 10, 11, 12]);
    assert.deepEqual(getPensionEligibleMonths({ ageAtYearEnd: 20, birthMonth: 5, birthdayIsFirst: true }), [4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test('60歳になる年は誕生日が1日かどうかで対象終了月が変わる', () => {
    assert.deepEqual(getPensionEligibleMonths({ ageAtYearEnd: 60, birthMonth: 6, birthdayIsFirst: false }), [1, 2, 3, 4, 5]);
    assert.deepEqual(getPensionEligibleMonths({ ageAtYearEnd: 60, birthMonth: 6, birthdayIsFirst: true }), [1, 2, 3, 4]);
});

test('20歳未満と60歳を超える年は国民年金の対象月がない', () => {
    assert.deepEqual(getPensionEligibleMonths({ ageAtYearEnd: 19, birthMonth: 1, birthdayIsFirst: false }), []);
    assert.deepEqual(getPensionEligibleMonths({ ageAtYearEnd: 61, birthMonth: 1, birthdayIsFirst: false }), []);
});

test('学生納付特例は対象月数を保ち、国民年金保険料を0円にする', () => {
    const result = calculateInsurance({ ...baseInput, isStudentExemption: true });
    assert.equal(result.pensionMonths, 12);
    assert.equal(result.nationalPension, 0);
});

test('健康保険の扶養範囲内なら国保を計上せず、基準を超えた場合は未加入月分を概算する', () => {
    const belowLimit = calculateInsurance({ ...baseInput, gross: 1400000, isHealthDependent: true, companyInsuranceMonths: [1, 2, 3, 4, 5, 6] });
    const aboveLimit = calculateInsurance({ ...baseInput, gross: 1600000, earnedIncome: 860000, isHealthDependent: true, companyInsuranceMonths: [1, 2, 3, 4, 5, 6] });
    assert.equal(belowLimit.nationalHealth, 0);
    assert.equal(aboveLimit.healthDependentLost, true);
    assert.equal(aboveLimit.nationalHealth, 17200);
});
test('令和7年分と令和8年分の給与所得を計算する', () => {
    assert.deepEqual(calculateEarnedIncome(1600000, '2025'), { salaryDeduction: 650000, earnedIncome: 950000 });
    assert.deepEqual(calculateEarnedIncome(1780000, '2026'), { salaryDeduction: 740000, earnedIncome: 1040000 });
});

test('令和8年分の給与所得控除後の給与表の境界を反映する', () => {
    const cases = [
        [2191000, 1451000], [2192999, 1451000],
        [2193000, 1453000], [2195999, 1453000],
        [2196000, 1456000], [2199999, 1456000],
        [2200000, 1460000]
    ];
    for (const [gross, expectedEarnedIncome] of cases) {
        assert.equal(calculateEarnedIncome(gross, '2026').earnedIncome, expectedEarnedIncome, `年収${gross}円`);
    }
});

test('基礎控除の令和7年分・令和8年分の境界を反映する', () => {
    assert.equal(basicDeduction(1320000, '2025'), 950000);
    assert.equal(basicDeduction(1320001, '2025'), 880000);
    assert.equal(basicDeduction(3360000, '2025'), 880000);
    assert.equal(basicDeduction(3360001, '2025'), 680000);
    assert.equal(basicDeduction(4890000, '2026'), 1040000);
    assert.equal(basicDeduction(4890001, '2026'), 670000);
});

test('勤労学生控除は年分ごとの所得上限の内外で切り替わる', () => {
    assert.equal(calculatePersonalTax({ earnedIncome: 850000, taxYear: '2025', isWorkStudent: true, insuranceTotal: 0 }).workStudentDeduction, 270000);
    assert.equal(calculatePersonalTax({ earnedIncome: 850001, taxYear: '2025', isWorkStudent: true, insuranceTotal: 0 }).workStudentDeduction, 0);
    assert.equal(calculatePersonalTax({ earnedIncome: 890000, taxYear: '2026', isWorkStudent: true, insuranceTotal: 0 }).workStudentDeduction, 270000);
    assert.equal(calculatePersonalTax({ earnedIncome: 890001, taxYear: '2026', isWorkStudent: true, insuranceTotal: 0 }).workStudentDeduction, 0);
});

test('本人の課税所得から基礎控除・勤労学生控除・社会保険料を差し引く', () => {
    const result = calculatePersonalTax({ earnedIncome: 1700000, taxYear: '2025', isWorkStudent: false, insuranceTotal: 20000 });
    assert.equal(result.standardBasicDeduction, 880000);
    assert.equal(result.taxableIncome, 800000);
    assert.equal(result.incomeTax, 40840);
});

test('所得税率表の境界と千円未満切り捨てを反映する', () => {
    assert.equal(incomeTaxFromTaxable(1999), 51);
    assert.equal(incomeTaxFromTaxable(1949000), 99496);
    assert.equal(incomeTaxFromTaxable(1950000), 99547);
    assert.equal(incomeTaxFromTaxable(1951000), 99649);
});

test('19〜22歳の令和7年分の親の控除額の境界を反映する', () => {
    const options = { isTaxDependent: true, ageGroup: '19_22', taxYear: '2025' };
    assert.equal(calculateParentDeduction(1500000, options), 630000);
    assert.equal(calculateParentDeduction(1500001, options), 610000);
    assert.equal(calculateParentDeduction(1880000, options), 30000);
    assert.equal(calculateParentDeduction(1880001, options), 0);
});

test('19〜22歳の令和8年分の親の控除額の境界を反映する', () => {
    const options = { isTaxDependent: true, ageGroup: '19_22', taxYear: '2026' };
    assert.equal(calculateParentDeduction(1590000, options), 630000);
    assert.equal(calculateParentDeduction(1590001, options), 610000);
    assert.equal(calculateParentDeduction(1970000, options), 30000);
    assert.equal(calculateParentDeduction(1970001, options), 0);
});

test('一般扶養控除の所得上限は年分で切り替わる', () => {
    assert.equal(calculateParentDeduction(1230000, { isTaxDependent: true, ageGroup: '16_18', taxYear: '2025' }), 380000);
    assert.equal(calculateParentDeduction(1230001, { isTaxDependent: true, ageGroup: '16_18', taxYear: '2025' }), 0);
    assert.equal(calculateParentDeduction(1360000, { isTaxDependent: true, ageGroup: '23_69', taxYear: '2026' }), 380000);
    assert.equal(calculateParentDeduction(1360001, { isTaxDependent: true, ageGroup: '23_69', taxYear: '2026' }), 0);
});

test('親の税扶養外と15歳以下は控除なし、70歳以上は48万円', () => {
    assert.equal(calculateParentDeduction(1000000, { isTaxDependent: false, ageGroup: '19_22', taxYear: '2026' }), 0);
    assert.equal(calculateParentDeduction(1000000, { isTaxDependent: true, ageGroup: 'under16', taxYear: '2026' }), 0);
    assert.equal(calculateParentDeduction(1000000, { isTaxDependent: true, ageGroup: '70plus', taxYear: '2026' }), 480000);
});

test('親の控除減少額から親の所得税増加を概算する', () => {
    assert.equal(estimateParentIncomeTaxIncrease(630000, 0.1), 64323);
    assert.equal(estimateParentIncomeTaxIncrease(0, 0.2), 0);
});