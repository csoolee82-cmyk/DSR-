import { GoogleGenAI } from "@google/genai";
import { CalculationResult, LoanInputs, CollateralType } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeDsrScenario = async (
  inputs: LoanInputs,
  result: CalculationResult
): Promise<string> => {
  try {
    const stressText = inputs.applyStressDsr ? "적용 (3.0% 가산)" : "미적용";
    const collateralText = inputs.collateralType === CollateralType.Housing ? "주택 및 오피스텔" : "기타 담보 (토지/상가 등)";
    const formattedIncome = Math.round(inputs.annualIncome).toLocaleString();
    const formattedLoan = Math.round(inputs.loanAmount).toLocaleString();
    const formattedInterest = Math.round(result.totalInterest).toLocaleString();
    const formattedMonthly = Math.round(result.avgMonthlyPayment).toLocaleString();

    const prompt = `
      재무 전문가로서 다음 대출 시나리오에 대한 DSR(총부채원리금상환비율) 분석과 조언을 제공해주세요.
      한국 금융 규제 기준을 고려하여 답변해주세요.

      **사용자 데이터:**
      - 연소득: ${formattedIncome} 원
      - 대출금액: ${formattedLoan} 원
      - 대출기간: ${inputs.loanTermYear}년
      - 거치기간: ${inputs.gracePeriodYear}년
      - 금리: ${inputs.interestRate}%
      - 스트레스 DSR 적용 여부: ${stressText}
      - 담보 종류: ${collateralText}
      
      **계산 로직 참고:**
      - 담보가 주택/오피스텔인 경우 거치기간은 DSR 산정 시 원금상환기간에서 제외되어 계산됨.
      - 기타 담보의 경우 표준 상환 기간으로 계산됨.

      **계산 결과:**
      - 계산된 DSR: ${result.dsrRatio.toFixed(2)}%
      - 총 이자비용: ${formattedInterest} 원
      - 월 평균 상환액: ${formattedMonthly} 원

      **요청사항:**
      1. 현재 DSR 수치가 안정적인지, 주의가 필요한지, 위험한 수준인지(규제 상한선 40~50% 기준 참고) 평가해주세요.
      2. 스트레스 DSR 적용 및 거치기간 설정이 DSR 수치에 미친 영향에 대해 언급해주세요.
      3. 상환 부담을 줄이기 위한 구체적인 조언을 3문장 내외로 요약해서 불렛포인트로 제공해주세요.
      
      매우 정중하고 전문적인 톤으로 작성해주세요. 마크다운 형식을 사용하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "분석을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "AI 분석 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
};