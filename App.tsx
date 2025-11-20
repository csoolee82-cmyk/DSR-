import React, { useState, useMemo, useRef } from 'react';
import { Calculator, CheckCircle2, Building2 } from 'lucide-react';
import { InputField } from './components/InputField';
import { Results } from './components/Results';
import { RepaymentMethod, CollateralType, LoanInputs, CalculationResult, MonthlyPayment } from './types';

function App() {
  // State for Inputs
  const [inputs, setInputs] = useState<LoanInputs>({
    annualIncome: 50000000, // Default 5,000 만원 -> 50,000,000 원
    loanAmount: 300000000, // Default 3억 -> 300,000,000 원
    interestRate: 4.5, // Default 4.5%
    loanTermYear: 30, // Default 30 years
    gracePeriodYear: 0,
    repaymentMethod: RepaymentMethod.PrincipalInterestEqual,
    collateralType: CollateralType.Housing,
    applyStressDsr: false,
  });

  const captureRef = useRef<HTMLDivElement>(null);

  // Calculation Logic
  const calculateDSR = useMemo((): CalculationResult => {
    const {
      loanAmount,
      interestRate,
      loanTermYear,
      gracePeriodYear,
      repaymentMethod,
      annualIncome,
      applyStressDsr,
      collateralType
    } = inputs;

    const monthlyPayments: MonthlyPayment[] = [];
    const totalMonths = loanTermYear * 12;
    const graceMonths = gracePeriodYear * 12;
    
    // Base Interest Rate (Monthly)
    const monthlyRate = (interestRate / 100) / 12;
    
    // Stress DSR Rate
    const stressRate = applyStressDsr ? 3.0 : 0;
    const stressInterestRate = interestRate + stressRate;
    const stressMonthlyRate = (stressInterestRate / 100) / 12;

    let remainingBalance = loanAmount;
    let totalInterest = 0;
    let totalPayment = 0;

    // 1. Generate Actual Payment Schedule (for Display)
    for (let m = 1; m <= totalMonths; m++) {
      let interestPayment = remainingBalance * monthlyRate;
      let principalPayment = 0;
      let monthlyTotal = 0;

      if (m <= graceMonths) {
        // Grace Period: Interest Only
        monthlyTotal = interestPayment;
      } else {
        const remainingMonths = totalMonths - (m - 1);
        const effectiveRemainingMonths = totalMonths - graceMonths; 

        if (repaymentMethod === RepaymentMethod.PrincipalEqual) {
          principalPayment = loanAmount / effectiveRemainingMonths;
          monthlyTotal = principalPayment + interestPayment;
        } else {
          // Principal & Interest Equal
          const n = effectiveRemainingMonths;
          // Recalculate PMT based on remaining balance at start of repayment period
          // For simplicity in standard P&I, we calculate PMT for the amortizing period
          // effectively treating it as a new loan starting after grace period.
          // Note: Accurate P&I with grace period usually keeps the original loan amount as basis if interest was paid.
          monthlyTotal = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
          principalPayment = monthlyTotal - interestPayment;
        }
      }

      remainingBalance -= principalPayment;
      if (remainingBalance < 0) remainingBalance = 0; 

      monthlyPayments.push({
        month: m,
        payment: monthlyTotal,
        principal: principalPayment,
        interest: interestPayment,
        balance: remainingBalance
      });

      totalInterest += interestPayment;
      totalPayment += monthlyTotal;
    }

    // 2. Calculate DSR Ratio (Official Logic)
    // DSR = (Annual Principal Burden + Annual Interest Burden) / Annual Income

    let annualPrincipalBurden = 0;
    let annualInterestBurden = 0;

    // A. Principal Burden Calculation
    if (collateralType === CollateralType.Housing) {
        // Housing Logic: Penalize Grace Period
        // If Grace Period exists, Principal is divided by (Loan Term - Grace Period)
        const effectiveTermYear = loanTermYear - gracePeriodYear;
        if (effectiveTermYear > 0) {
            annualPrincipalBurden = loanAmount / effectiveTermYear;
        } else {
            annualPrincipalBurden = loanAmount; // Should not happen logically unless term=grace
        }
    } else {
        // Other Collateral Logic: Standard Average
        // Usually treated as LoanAmount / LoanTerm (or specific deemed maturity like 8/10 years)
        // Here we use LoanTerm based on user input.
        annualPrincipalBurden = loanAmount / loanTermYear;
    }

    // B. Interest Burden Calculation
    // Use Stress Rate if applied. 
    // We calculate the Total Interest over the full term using the Stress Rate, then divide by Loan Term.
    let totalStressInterest = 0;
    
    // Quick simulation for Total Interest under Stress Rate
    // We can't just use 'totalInterest' from above because that uses the actual rate.
    let stressBalance = loanAmount;
    for (let m = 1; m <= totalMonths; m++) {
        const stressInt = stressBalance * stressMonthlyRate;
        let stressPrincipal = 0;
        
        if (m > graceMonths) {
             const effectiveRemainingMonths = totalMonths - graceMonths;
             if (repaymentMethod === RepaymentMethod.PrincipalEqual) {
                 stressPrincipal = loanAmount / effectiveRemainingMonths;
             } else {
                 const n = effectiveRemainingMonths;
                 const pmt = (loanAmount * stressMonthlyRate * Math.pow(1 + stressMonthlyRate, n)) / (Math.pow(1 + stressMonthlyRate, n) - 1);
                 stressPrincipal = pmt - stressInt;
             }
        }
        
        totalStressInterest += stressInt;
        stressBalance -= stressPrincipal;
        if (stressBalance < 0) stressBalance = 0;
    }

    annualInterestBurden = totalStressInterest / loanTermYear;

    // Total Annual Repayment for DSR
    const annualRepaymentForDsr = annualPrincipalBurden + annualInterestBurden;

    const dsrRatio = annualIncome > 0 ? (annualRepaymentForDsr / annualIncome) * 100 : 0;

    return {
      dsrRatio,
      monthlyPayments,
      totalInterest, // Actual total interest
      totalPayment, // Actual total payment
      avgMonthlyPayment: totalPayment / totalMonths,
      stressDsrRateUsed: stressInterestRate
    };
  }, [inputs]);

  // Handlers
  const updateInput = (key: keyof LoanInputs, value: any) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div ref={captureRef} className="max-w-6xl mx-auto bg-slate-50 p-4 sm:p-6 rounded-xl">
        {/* Header */}
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center justify-center sm:justify-start gap-3">
            <Calculator className="w-8 h-8 text-blue-600" />
            Smart DSR 계산기
          </h1>
          <p className="mt-2 text-slate-600">
            스트레스 DSR 3.0% 적용 시뮬레이션 및 AI 기반 상환 분석
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Input Section */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 border-b pb-2">대출 조건 입력</h2>
              
              <div className="space-y-5">
                <InputField 
                  label="연소득 (세전)" 
                  unit="원" 
                  value={inputs.annualIncome} 
                  onChange={(v) => updateInput('annualIncome', v)}
                  step={1000000}
                />

                <InputField 
                  label="대출 금액" 
                  unit="원" 
                  value={inputs.loanAmount} 
                  onChange={(v) => updateInput('loanAmount', v)}
                  step={1000000}
                />

                <div className="grid grid-cols-2 gap-4">
                  <InputField 
                    label="대출 기간" 
                    unit="년" 
                    value={inputs.loanTermYear} 
                    onChange={(v) => updateInput('loanTermYear', v)}
                  />
                  <InputField 
                    label="거치 기간" 
                    unit="년" 
                    value={inputs.gracePeriodYear} 
                    onChange={(v) => updateInput('gracePeriodYear', v)}
                  />
                </div>

                <InputField 
                  label="대출 금리" 
                  unit="%" 
                  value={inputs.interestRate} 
                  onChange={(v) => updateInput('interestRate', v)}
                  step={0.1}
                />

                {/* Repayment Method */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">상환 방식</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateInput('repaymentMethod', RepaymentMethod.PrincipalInterestEqual)}
                      className={`px-3 py-2 text-sm rounded-md border transition-all ${
                        inputs.repaymentMethod === RepaymentMethod.PrincipalInterestEqual
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      원리금균등
                    </button>
                    <button
                      onClick={() => updateInput('repaymentMethod', RepaymentMethod.PrincipalEqual)}
                      className={`px-3 py-2 text-sm rounded-md border transition-all ${
                        inputs.repaymentMethod === RepaymentMethod.PrincipalEqual
                          ? 'bg-blue-50 border-blue-500 text-blue-700 font-medium'
                          : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      원금균등
                    </button>
                  </div>
                </div>

                {/* Collateral Type */}
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">담보 종류</label>
                  <div className="relative">
                    <select
                      value={inputs.collateralType}
                      onChange={(e) => updateInput('collateralType', e.target.value)}
                      className="block w-full rounded-md border-slate-300 py-2 pl-3 pr-10 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 sm:text-sm bg-white border appearance-none"
                    >
                      <option value={CollateralType.Housing}>주택 및 오피스텔</option>
                      <option value={CollateralType.Other}>기타 담보대출 (토지/상가 등)</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>
                  {inputs.collateralType === CollateralType.Housing && inputs.gracePeriodYear > 0 && (
                    <p className="text-xs text-orange-600 mt-1 ml-1">
                      * 주택담보대출 거치기간 설정 시 DSR 계산에서 원금 상환 기간이 단축되어 불리할 수 있습니다.
                    </p>
                  )}
                </div>

                {/* Stress DSR Toggle */}
                <div 
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    inputs.applyStressDsr 
                      ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' 
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => updateInput('applyStressDsr', !inputs.applyStressDsr)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                       inputs.applyStressDsr ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-400'
                    }`}>
                      {inputs.applyStressDsr && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${inputs.applyStressDsr ? 'text-indigo-900' : 'text-slate-700'}`}>
                        스트레스 DSR (3.0%) 적용
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        수도권 규제지역 주택담보대출 시뮬레이션
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Result Section */}
          <div className="lg:col-span-8">
            <Results result={calculateDSR} inputs={inputs} captureRef={captureRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;