const calculatorForm = document.getElementById('calculatorForm');
const inputError = document.getElementById('inputError');
const currentIncomeInput = document.getElementById('currentIncome');
const ageInput = document.getElementById('ageAtYearEnd');
const birthGroup = document.getElementById('birthMonthGroup');
const birthMonthSelect = document.getElementById('birthMonth');
const taxYearSelect = document.getElementById('taxYear');
const incomeGuidance = document.getElementById('incomeGuidance');
const monthsGuidance = document.getElementById('monthsGuidance');
const companyInsuranceCheckbox = document.getElementById('isCompanyInsured');
const companyInsuranceMonthsGroup = document.getElementById('companyInsuranceMonthsGroup');
const companyInsuranceMonthChecks = document.getElementById('companyInsuranceMonthChecks');

for (let month = 1; month <= 12; month++) {
    birthMonthSelect.add(new Option(`${month}月`, month));

    const monthLabel = document.createElement('label');
    const monthCheckbox = document.createElement('input');
    monthCheckbox.type = 'checkbox';
    monthCheckbox.name = 'companyInsuranceMonth';
    monthCheckbox.value = month;
    monthCheckbox.checked = true;
    monthCheckbox.defaultChecked = true;
    monthCheckbox.setAttribute('aria-describedby', 'companyInsuranceMonthsHint');
    monthLabel.append(monthCheckbox, document.createTextNode(`${month}月`));
    companyInsuranceMonthChecks.append(monthLabel);
}

function formatIncomeInput(event) {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? input.value.length;
    const digitsBeforeCursor = input.value.slice(0, cursor).replace(/\D/g, '').length;
    const digits = input.value.replace(/\D/g, '');
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    input.value = formatted;

    let nextCursor = 0;
    let digitsPassed = 0;
    while (nextCursor < formatted.length && digitsPassed < digitsBeforeCursor) {
        if (/\d/.test(formatted[nextCursor])) digitsPassed++;
        nextCursor++;
    }
    input.setSelectionRange(nextCursor, nextCursor);
}
function updateBirthMonthVisibility() {
    const needsBirthMonth = ageInput.value === '20' || ageInput.value === '60';
    birthGroup.hidden = !needsBirthMonth;
    birthMonthSelect.required = needsBirthMonth;
}

function updateCompanyInsuranceVisibility() {
    const isInsured = companyInsuranceCheckbox.checked;
    companyInsuranceMonthsGroup.hidden = !isInsured;

}

function updateIncomeGuidance() {
    const selectedYear = Number(taxYearSelect.value);
    const currentYear = new Date().getFullYear();
    if (selectedYear === currentYear) {
        incomeGuidance.textContent = `${selectedYear}年1月から現在までに受け取った給与を入力してください。複数の勤務先や賞与も合計します。`;
        monthsGuidance.textContent = `給与が振り込まれた月の数です（例：1〜8月に毎月受け取ったなら8か月）。入力した月平均が年末まで続く想定で予測します。`;
    } else if (selectedYear < currentYear) {
        incomeGuidance.textContent = `${selectedYear}年分の試算です。複数の勤務先や賞与を含め、その年に受け取った給与を入力してください。`;
        monthsGuidance.textContent = `年間の実績なら12か月です。年途中までの累計から予測する場合は、給与が振り込まれた月数を入力してください。`;
    } else {
        incomeGuidance.textContent = `${selectedYear}年分の試算です。予測したい給与額を入力してください。複数の勤務先や賞与も合計します。`;
        monthsGuidance.textContent = `給与を受け取る予定の月数です（1〜12か月）。月平均がその年の12か月続く想定で計算します。`;
    }
}

function showInputError(message, focusTarget) {
    inputError.textContent = message;
    inputError.hidden = !message;
    if (typeof focusTarget === 'string') document.getElementById(focusTarget).focus();
    else if (focusTarget) focusTarget.focus();
}

ageInput.addEventListener('input', updateBirthMonthVisibility);
taxYearSelect.addEventListener('change', updateIncomeGuidance);
companyInsuranceCheckbox.addEventListener('change', updateCompanyInsuranceVisibility);
currentIncomeInput.addEventListener('input', formatIncomeInput);
calculatorForm.addEventListener('input', () => showInputError(''));
calculatorForm.addEventListener('change', () => showInputError(''));
calculatorForm.addEventListener('submit', calculateV2);
calculatorForm.addEventListener('reset', () => {
    window.setTimeout(() => {
        showInputError('');
        updateBirthMonthVisibility();
        updateIncomeGuidance();
        updateCompanyInsuranceVisibility();
        document.getElementById('resultV2').style.display = 'none';
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }, 0);
});
updateBirthMonthVisibility();
updateIncomeGuidance();
updateCompanyInsuranceVisibility();

function calculateV2(event) {
    event.preventDefault();
    showInputError('');
    const incomeText = document.getElementById('currentIncome').value.trim();
    const monthsText = document.getElementById('elapsedMonths').value.trim();
    const incomeToDate = Number(incomeText.replace(/,/g, ''));
    const monthsElapsed = Number(monthsText);
    const ageText = document.getElementById('ageAtYearEnd').value.trim();
    const ageAtYearEnd = Number(ageText);
    const birthMonth = Number(document.getElementById('birthMonth').value);
    const birthdayIsFirst = document.getElementById('birthdayIsFirst').checked;
    const ageGroup = ageAtYearEnd <= 15 ? 'under16' : ageAtYearEnd <= 18 ? '16_18' : ageAtYearEnd <= 22 ? '19_22' : ageAtYearEnd <= 69 ? '23_69' : '70plus';
    const taxYear = document.getElementById('taxYear').value;
    const parentTaxRate = Number(document.getElementById('parentTaxRate').value);
    const isTaxDependent = document.getElementById('isTaxDependent').checked;
    const isHealthDependent = document.getElementById('isHealthDependent').checked;
    const isCompanyInsured = companyInsuranceCheckbox.checked;
    const companyInsuranceMonths = isCompanyInsured
        ? Array.from(companyInsuranceMonthChecks.querySelectorAll('input:checked'), input => Number(input.value))
        : [];
    const isStudentExemption = document.getElementById('isStudentExemption').checked;
    const isWorkStudent = document.getElementById('isWorkStudent').checked;

    if (!incomeText || !Number.isFinite(incomeToDate) || !Number.isInteger(incomeToDate) || incomeToDate < 0) {
        showInputError('給与の合計を0円以上の整数で入力してください。', 'currentIncome');
        return;
    }
    if (!monthsText || !Number.isInteger(monthsElapsed) || monthsElapsed < 1 || monthsElapsed > 12) {
        showInputError('給与を受け取った月数を1〜12の整数で入力してください。', 'elapsedMonths');
        return;
    }
    if (!ageText || !Number.isInteger(ageAtYearEnd) || ageAtYearEnd < 0 || ageAtYearEnd > 120) {
        showInputError('12月31日時点の年齢を0〜120の整数で入力してください。', 'ageAtYearEnd');
        return;
    }
    if ((ageAtYearEnd === 20 || ageAtYearEnd === 60) && (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12)) {
        showInputError('年末時点で20歳または60歳の方は誕生月を選択してください。', 'birthMonth');
        return;
    }
    if ((ageAtYearEnd < 20 || ageAtYearEnd >= 60) && isStudentExemption) {
        showInputError('学生納付特例は20歳以上60歳未満の方が対象です。年齢とチェックを確認してください。', 'isStudentExemption');
        return;
    }
    if (isCompanyInsured && companyInsuranceMonths.length === 0) {
        showInputError('勤務先の社会保険に加入していた月を1か月以上選択してください。', companyInsuranceMonthChecks.querySelector('input'));
        return;
    }

    const projectedIncome = IncomeWallCalculations.projectAnnualIncome(incomeToDate, monthsElapsed);
    const averageMonthly = Math.round(incomeToDate / monthsElapsed);
    const yen = value => `${Math.round(value).toLocaleString('ja-JP')}円`;

    function calculatePersonal(gross) {
        const { salaryDeduction, earnedIncome } = IncomeWallCalculations.calculateEarnedIncome(gross, taxYear);

        const insurance = IncomeWallCalculations.calculateInsurance({
            gross,
            earnedIncome,
            ageAtYearEnd,
            ageGroup,
            birthMonth,
            birthdayIsFirst,
            taxYear,
            isHealthDependent,
            companyInsuranceMonths,
            isStudentExemption
        });
        const {
            employeeInsurance,
            nationalHealth,
            nationalPension,
            pensionMonths,
            healthDependentLost,
            dependentHealthLimit
        } = insurance;

        // 実際に支払う社会保険料は、本人の所得税計算上の社会保険料控除として差し引く。
        const insuranceTotal = employeeInsurance + nationalHealth + nationalPension;
        const personalTax = IncomeWallCalculations.calculatePersonalTax({
            earnedIncome, taxYear, isWorkStudent, insuranceTotal
        });
        const { standardBasicDeduction, workStudentDeduction, taxableIncome, incomeTax } = personalTax;
        return {
            gross, salaryDeduction, earnedIncome, standardBasicDeduction, workStudentDeduction,
            taxableIncome, incomeTax, employeeInsurance, nationalHealth, nationalPension,
            insuranceTotal, net: gross - incomeTax - insuranceTotal,
            healthDependentLost, dependentHealthLimit, pensionMonths
        };
    }

    const personal = calculatePersonal(projectedIncome);
    const parentDeductionAtNoIncome = IncomeWallCalculations.calculateParentDeduction(0, { isTaxDependent, ageGroup, taxYear });
    const parentDeductionCurrent = IncomeWallCalculations.calculateParentDeduction(projectedIncome, { isTaxDependent, ageGroup, taxYear });
    const parentDeductionLoss = Math.max(0, parentDeductionAtNoIncome - parentDeductionCurrent);
    const parentIncomeTaxIncrease = IncomeWallCalculations.estimateParentIncomeTaxIncrease(parentDeductionLoss, parentTaxRate);
    const householdImpact = personal.net - parentIncomeTaxIncrease;

    const personalHtml = [
        `<p>年収予測：<strong>${yen(projectedIncome)}</strong>（現在の月平均 ${yen(averageMonthly)} が続く想定）</p>`,
        `<p>本人の所得税・復興特別所得税（概算）：${yen(personal.incomeTax)}</p>`,
        `<p>給与所得控除：${yen(personal.salaryDeduction)} ／ 給与所得：${yen(personal.earnedIncome)}</p>`,
        `<p>勤労学生控除：${yen(personal.workStudentDeduction)}${personal.workStudentDeduction ? '（要件に該当する選択時）' : ''}</p>`,
        isCompanyInsured
            ? `<p>勤務先の健康保険・厚生年金（概算、加入${companyInsuranceMonths.length}か月：${companyInsuranceMonths.map(month => `${month}月`).join('・')}）：${yen(personal.employeeInsurance)}<br><small>年収を12等分した月収の約15%を加入月分計上。実額は標準報酬月額・保険料率などで異なります。</small></p>`
            : '',
        `<p>国民健康保険（勤務先保険の未加入月分の概算）：${yen(personal.nationalHealth)}<br>国民年金（対象${personal.pensionMonths}か月分）：${yen(personal.nationalPension)}${isStudentExemption && ageAtYearEnd >= 20 && ageAtYearEnd < 60 ? '（学生納付特例が承認される前提。免除ではなく猶予）' : ''}</p>`,
        `<p><strong>本人の手取り参考額：${yen(personal.net)}</strong></p>`
    ].join('');

    let parentStatus;
    if (!isTaxDependent) {
        parentStatus = '「現在、親の税法上の扶養に入っていない」を選択しているため、親の控除変化は計上していません。';
    } else if (ageGroup === 'under16') {
        parentStatus = '15歳以下は所得税の扶養控除による親の税額差をこの試算では計上していません。';
    } else {
        parentStatus = '給与収入がない場合の控除 ' + yen(parentDeductionAtNoIncome) + ' → 予測年収時の控除 ' + yen(parentDeductionCurrent) + '。';
    }
    const parentHtml = `<p>${parentStatus}</p><p>親の所得税・復興特別所得税の増加見込み：<strong>${yen(parentIncomeTaxIncrease)}</strong></p><p class="notice">選択した親の限界税率を使った概算です。親の住民税は含みません。70歳以上は同居老親等以外の控除額で計算しています。同居老親等に該当する場合は実額と異なります。</p>`;


    const comparisonHtml =
        '<p>本人の手取り参考額：' + yen(personal.net) + '</p>' +
        '<p>親の所得税・復興特別所得税の増加見込み：−' + yen(parentIncomeTaxIncrease) + '</p>' +
        '<p><strong>本人の収入による世帯への手取り影響（概算）：' + (householdImpact >= 0 ? '+' : '') + yen(householdImpact) + '</strong></p>' +
        '<p class="notice">本人の手取り参考額から、親の所得税・復興特別所得税の増加見込みを差し引いた目安です。親の給与や住民税、自治体別の保険料は含みません。</p>';

    document.getElementById('personalResultText').innerHTML = personalHtml;
    document.getElementById('parentResultText').innerHTML = parentHtml;
    document.getElementById('householdResultText').innerHTML = comparisonHtml;
    document.getElementById('resultV2').style.display = 'block';
    document.querySelector('#resultV2 h3').focus();
}

