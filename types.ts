export enum RepaymentMethod {
  PrincipalInterestEqual = 'PrincipalInterestEqual', // 원리금균등
  PrincipalEqual = 'PrincipalEqual', // 원금균등
}

export enum CollateralType {
  Housing = 'Housing', // 주택 및 오피스텔
  Other = 'Other', // 이외 담보대출
}

export interface LoanInputs {
  annualIncome: number; // 연소득 (Required for DSR)
  loanAmount: number;
  interestRate: number;
  loanTermYear: number;
  gracePeriodYear: number;
  repaymentMethod: RepaymentMethod;
  collateralType: CollateralType;
  applyStressDsr: boolean;
}

export interface MonthlyPayment {
  month: number;
  payment: number; // Total payment this month
  principal: number; // Principal portion
  interest: number; // Interest portion
  balance: number; // Remaining balance
}

export interface CalculationResult {
  dsrRatio: number;
  monthlyPayments: MonthlyPayment[];
  totalInterest: number;
  totalPayment: number;
  avgMonthlyPayment: number;
  stressDsrRateUsed: number; // The interest rate used for DSR check
}

export interface AiAnalysisResult {
  advice: string;
  riskLevel: 'Safe' | 'Caution' | 'High Risk';
}