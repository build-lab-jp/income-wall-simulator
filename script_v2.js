const calculatorForm = document.getElementById('calculatorForm');
const inputError = document.getElementById('inputError');
const ageInput = document.getElementById('ageAtYearEnd');
const birthGroup = document.getElementById('birthMonthGroup');
const birthMonthSelect = document.getElementById('birthMonth');
const taxYearSelect = document.getElementById('taxYear');
const incomeGuidance = document.getElementById('incomeGuidance');
const monthsGuidance = document.getElementById('monthsGuidance');
const companyInsuranceCheckbox = document.getElementById('isCompanyInsured');
const companyInsuranceMonthsGroup = document.getElementById('companyInsuranceMonthsGroup');
const companyInsuranceMonthsInput = document.getElementById('companyInsuranceMonths');

for (let month = 1; month <= 12; month++) {
    birthMonthSelect.add(new Option(`${month}月`, month));
}

function updateBirthMonthVisibility() {
    const needsBirthMonth = ageInput.value === '20' || ageInput.value === '60';
    birthGroup.hidden = !needsBirthMonth;
    birthMonthSelect.required = needsBirthMonth;
}

function updateCompanyInsuranceVisibility() {
    const isInsured = companyInsuranceCheckbox.checked;
    companyInsuranceMonthsGroup.hidden = !isInsured;
    companyInsuranceMonthsInput.required = isInsured;
}

function updateIncomeGuidance() {
    const selectedYear = Number(taxYearSelect.value);
    const currentYear = new Date().getFullYear();
    if (selectedYear === currentYear) {
        incomeGuidance.textContent = `${selectedYear}年1月から現在までに受け取った給与を入力してください。複数の勤務先や賞与も合計します。`;
        monthsGuidance.textContent = `これまでに給与を受け取った月数を入力してください。入力額の月平均が年末まで続く想定で予測します。`;
    } else if (selectedYear < currentYear) {
        incomeGuidance.textContent = `${selectedYear}年分の試算です。複数の勤務先や賞与を含め、その年に受け取った給与を入力してください。`;
        monthsGuidance.textContent = `年間の実績を入力する場合は12か月にしてください。年途中までの累計から予測する場合は、その時点までの月数を入力します。`;
    } else {
        incomeGuidance.textContent = `${selectedYear}年分の試算です。予測したい給与額を入力してください。複数の勤務先や賞与も合計します。`;
        monthsGuidance.textContent = `予測額の月平均が12か月続くものとして年収を計算します。`;
    }
}

function showInputError(message, focusTargetId) {
    inputError.textContent = message;
    inputError.hidden = !message;
    if (focusTargetId) document.getElementById(focusTargetId).focus();
}

ageInput.addEventListener('input', updateBirthMonthVisibility);
taxYearSelect.addEventListener('change', updateIncomeGuidance);
companyInsuranceCheckbox.addEventListener('change', updateCompanyInsuranceVisibility);
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
    const incomeToDate = Number(incomeText);
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
    const companyInsuranceMonthsText = companyInsuranceMonthsInput.value.trim();
    const companyInsuranceMonths = Number(companyInsuranceMonthsText);
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
    if (isCompanyInsured && (!companyInsuranceMonthsText || !Number.isInteger(companyInsuranceMonths) || companyInsuranceMonths < 1 || companyInsuranceMonths > 12)) {
        showInputError('勤務先の社会保険加入月数を1〜12の整数で入力してください。', 'companyInsuranceMonths');
        return;
    }

    const projectedIncome = Math.round(incomeToDate / monthsElapsed * 12);
    const averageMonthly = Math.round(incomeToDate / monthsElapsed);
    const baselineIncome = 1000000;
    const yen = value => `${Math.round(value).toLocaleString('ja-JP')}円`;

    // 給与所得控除。2025・2026年分の最低保障と速算式を使う。
    function employmentDeduction(gross) {
        if (taxYear === '2025') {
            if (gross <= 1900000) return Math.min(gross, 650000);
            if (gross <= 3600000) return gross * 0.30 + 80000;
            if (gross <= 6600000) return gross * 0.20 + 440000;
            if (gross <= 8500000) return gross * 0.10 + 1100000;
            return 1950000;
        }
        if (gross <= 2200000) return Math.min(gross, 740000);
        if (gross <= 3600000) return gross * 0.30 + 80000;
        if (gross <= 6600000) return gross * 0.20 + 440000;
        if (gross <= 8500000) return gross * 0.10 + 1100000;
        return 1950000;
    }

    function basicDeduction(earnedIncome) {
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
        return Math.round(Math.max(0, tax) * 1.021); // 復興特別所得税を含む
    }

    function calculatePersonal(gross) {
        const salaryDeduction = employmentDeduction(gross);
        const earnedIncome = Math.max(0, gross - salaryDeduction);
        const standardBasicDeduction = basicDeduction(earnedIncome);
        const workStudentLimit = taxYear === '2025' ? 850000 : 890000;
        const workStudentDeduction = isWorkStudent && earnedIncome <= workStudentLimit ? 270000 : 0;

        let employeeInsurance = 0;
        let nationalHealth = 0;
        let nationalPension = 0;
        let pensionMonths = 0;
        const dependentHealthLimit = ageGroup === '19_22' ? 1500000 : 1300000;
        const healthDependentLost = isHealthDependent && gross >= dependentHealthLimit;

        if (isCompanyInsured) {
            // 実際に勤務先の健保・厚生年金へ加入している前提の概算。
            employeeInsurance = Math.round((gross / 12) * 0.15 * companyInsuranceMonths);
        } else {
            if (!isHealthDependent || healthDependentLost) {
                // 国保料は自治体・前年所得等で異なるため、所得割の単純な参考値。
                nationalHealth = Math.max(30000, Math.round(Math.max(0, earnedIncome - 430000) * 0.08));
            }
            let firstMonthInYear = 1;
            let lastMonthInYear = 12;
            if (ageAtYearEnd < 20 || ageAtYearEnd > 60) {
                lastMonthInYear = 0;
            } else if (ageAtYearEnd === 20) {
                firstMonthInYear = Math.max(1, birthdayIsFirst ? birthMonth - 1 : birthMonth);
            } else if (ageAtYearEnd === 60) {
                // 60歳到達日（誕生日の前日）が属する月の前月分までが納付対象。
                lastMonthInYear = birthdayIsFirst ? birthMonth - 2 : birthMonth - 1;
            }
            pensionMonths = Math.max(0, lastMonthInYear - firstMonthInYear + 1);
            if (pensionMonths > 0) {
                const monthlyRate = month => taxYear === '2025' ? (month <= 3 ? 16980 : 17510) : (month <= 3 ? 17510 : 17920);
                const pensionForYear = Array.from({length: pensionMonths}, (_, i) => monthlyRate(firstMonthInYear + i)).reduce((sum, rate) => sum + rate, 0);
                nationalPension = isStudentExemption ? 0 : pensionForYear;
            }
        }

        // 実際に支払う社会保険料は、本人の所得税計算上の社会保険料控除として差し引く。
        const insuranceTotal = employeeInsurance + nationalHealth + nationalPension;
        const taxableIncome = Math.max(0, earnedIncome - standardBasicDeduction - workStudentDeduction - insuranceTotal);
        const incomeTax = incomeTaxFromTaxable(taxableIncome);
        return {
            gross, salaryDeduction, earnedIncome, standardBasicDeduction, workStudentDeduction,
            taxableIncome, incomeTax, employeeInsurance, nationalHealth, nationalPension,
            insuranceTotal, net: gross - incomeTax - insuranceTotal,
            healthDependentLost, dependentHealthLimit, pensionMonths
        };
    }

    // 親の所得税上の控除額。19〜22歳は特定扶養・特定親族特別控除の年分別表。
    function parentDeduction(gross) {
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
        // 16〜18歳・23〜69歳は一般扶養控除。70歳以上は同居老親等の判定が
        // 必要なため、ここでは老人扶養親族（同居老親等以外）の額を使う。
        if (gross > dependentIncomeLimit) return 0;
        if (ageGroup === '70plus') return 480000;
        return 380000;
    }

    const personal = calculatePersonal(projectedIncome);
    const baseline = calculatePersonal(baselineIncome);
    const parentDeductionAtBaseline = parentDeduction(baselineIncome);
    const parentDeductionCurrent = parentDeduction(projectedIncome);
    const parentDeductionLoss = Math.max(0, parentDeductionAtBaseline - parentDeductionCurrent);
    const parentIncomeTaxIncrease = Math.round(parentDeductionLoss * parentTaxRate * 1.021);
    const householdNetAtBaseline = baseline.net;
    const householdNetCurrent = personal.net - parentIncomeTaxIncrease;
    const incomeIncrease = projectedIncome - baselineIncome;
    const netIncrease = householdNetCurrent - householdNetAtBaseline;
    const offsetByTaxAndInsurance = incomeIncrease - netIncrease;

    const personalHtml = [
        `<p>年収予測：<strong>${yen(projectedIncome)}</strong>（現在の月平均 ${yen(averageMonthly)} が続く想定）</p>`,
        `<p>本人の所得税・復興特別所得税（概算）：${yen(personal.incomeTax)}</p>`,
        `<p>給与所得控除：${yen(personal.salaryDeduction)} ／ 給与所得：${yen(personal.earnedIncome)}</p>`,
        `<p>勤労学生控除：${yen(personal.workStudentDeduction)}${personal.workStudentDeduction ? '（要件に該当する選択時）' : ''}</p>`,
        isCompanyInsured
            ? `<p>勤務先の健康保険・厚生年金（概算、加入${companyInsuranceMonths}か月）：${yen(personal.employeeInsurance)}<br><small>年収を12等分した月収の約15%を加入月数分計上。実額は標準報酬月額・保険料率などで異なります。</small></p>`
            : `<p>国民健康保険（概算）：${yen(personal.nationalHealth)}<br>国民年金（${personal.pensionMonths}か月分）の当年支払見込み：${yen(personal.nationalPension)}${isStudentExemption && ageAtYearEnd >= 20 && ageAtYearEnd < 60 ? '（学生納付特例が承認される前提。免除ではなく猶予）' : ''}</p>`,
        `<p><strong>本人の手取り参考額：${yen(personal.net)}</strong></p>`
    ].join('');

    let parentStatus;
    if (!isTaxDependent) {
        parentStatus = '「現在、親の税法上の扶養に入っていない」を選択しているため、親の控除変化は計上していません。';
    } else if (ageGroup === 'under16') {
        parentStatus = '15歳以下は所得税の扶養控除による親の税額差をこの試算では計上していません。';
    } else {
        parentStatus = `基準年収時の控除 ${yen(parentDeductionAtBaseline)} → 予測年収時の控除 ${yen(parentDeductionCurrent)}。`;
    }
    const parentHtml = `<p>${parentStatus}</p><p>親の所得税・復興特別所得税の増加見込み：<strong>${yen(parentIncomeTaxIncrease)}</strong></p><p class="notice">選択した親の限界税率を使った概算です。親の住民税は含みません。70歳以上は同居老親等以外の控除額で計算しています。同居老親等に該当する場合は実額と異なります。</p>`;

    let comparisonHtml = `<p>基準年収 ${yen(baselineIncome)} からの収入増：${incomeIncrease >= 0 ? '+' : ''}${yen(incomeIncrease)}</p>` +
        `<p>世帯の手取り増減（概算）：<strong>${netIncrease >= 0 ? '+' : ''}${yen(netIncrease)}</strong></p>`;
    if (incomeIncrease > 0 && netIncrease <= 0) {
        comparisonHtml += `<p class="notice"><strong>負担が収入増を上回る可能性</strong>があります。税・保険料等による相殺額の目安は ${yen(offsetByTaxAndInsurance)} です。</p>`;
    } else if (incomeIncrease > 0 && offsetByTaxAndInsurance > 0) {
        comparisonHtml += `<p>税・保険料等による相殺額の目安：${yen(offsetByTaxAndInsurance)}</p>`;
    } else if (incomeIncrease <= 0) {
        comparisonHtml += `<p class="notice">予測年収が比較基準以下のため、相殺額評価の対象外です。</p>`;
    } else {
        comparisonHtml += `<p>この条件では、基準ケースからの世帯手取り増が収入増を下回っていません。</p>`;
    }
    comparisonHtml += `<p class="notice">比較では、本人の所得税と保険料、親の所得税差を反映しています。住民税や自治体別の保険料、賞与・シフト変動は含みません。</p>`;

    document.getElementById('personalResultText').innerHTML = personalHtml;
    document.getElementById('parentResultText').innerHTML = parentHtml;
    document.getElementById('householdResultText').innerHTML = comparisonHtml;
    document.getElementById('resultV2').style.display = 'block';
    document.querySelector('#resultV2 h3').focus();
}

