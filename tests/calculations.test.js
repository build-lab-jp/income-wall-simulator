const test = require('node:test');
const assert = require('node:assert/strict');
const { projectAnnualIncome, getPensionEligibleMonths, calculateInsurance } = require('../calculations.js');

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