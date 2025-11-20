import React, { useState, useEffect } from 'react';
import { CalculationResult, LoanInputs } from '../types';
import { analyzeDsrScenario } from '../services/geminiService';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { AlertCircle, CheckCircle, BrainCircuit, Loader2, Camera } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';

interface ResultsProps {
  result: CalculationResult;
  inputs: LoanInputs;
  captureRef: React.RefObject<HTMLDivElement | null>;
}

const COLORS = ['#3b82f6', '#94a3b8']; // Blue-500, Slate-400

// Helper for formatting large Korean currency
const formatWon = (val: number) => {
    return new Intl.NumberFormat('ko-KR').format(Math.round(val));
};

export const Results: React.FC<ResultsProps> = ({ result, inputs, captureRef }) => {
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // DSR Status Logic
  let dsrStatusColor = 'text-green-600';
  let dsrStatusText = '안정';
  let dsrBg = 'bg-green-50';
  
  if (result.dsrRatio > 40 && result.dsrRatio <= 70) {
    dsrStatusColor = 'text-yellow-600';
    dsrStatusText = '주의';
    dsrBg = 'bg-yellow-50';
  } else if (result.dsrRatio > 70) {
    dsrStatusColor = 'text-red-600';
    dsrStatusText = '위험';
    dsrBg = 'bg-red-50';
  }

  const handleAiAnalyze = async () => {
    setLoadingAi(true);
    const advice = await analyzeDsrScenario(inputs, result);
    setAiAdvice(advice);
    setLoadingAi(false);
  };

  const handleSaveImage = async () => {
    if (captureRef.current) {
      try {
        setIsCapturing(true);
        // Small delay to ensure UI updates 
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const canvas = await html2canvas(captureRef.current, {
          backgroundColor: '#f8fafc', // slate-50 to match app background
          scale: 2, // Higher resolution
          logging: false,
          useCORS: true, // For external images/fonts if any
          onclone: (clonedDoc) => {
             // Transform inputs to divs to prevent text clipping in html2canvas
             const inputs = clonedDoc.querySelectorAll('input');
             inputs.forEach((input) => {
                const div = clonedDoc.createElement('div');
                div.className = input.className;
                // Maintain visual appearance and alignment
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.textContent = input.value;
                
                if (input.parentElement) {
                    input.parentElement.replaceChild(div, input);
                }
             });

             // Transform selects to divs
             const selects = clonedDoc.querySelectorAll('select');
             selects.forEach((select) => {
                const div = clonedDoc.createElement('div');
                div.className = select.className;
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                const selectedOption = select.options[select.selectedIndex];
                div.textContent = selectedOption ? selectedOption.text : '';
                
                if (select.parentElement) {
                    select.parentElement.replaceChild(div, select);
                }
             });
          }
        });

        const link = document.createElement('a');
        link.download = `DSR_Analysis_${new Date().toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error("Failed to save image", err);
        alert("이미지 저장에 실패했습니다.");
      } finally {
        setIsCapturing(false);
      }
    }
  };

  // Reset AI advice when inputs effectively change the result significantly
  useEffect(() => {
    setAiAdvice(null);
  }, [result]);

  // Prepare chart data (sample down for performance if too long)
  const chartData = result.monthlyPayments.filter((_, index) => index % 12 === 0 || index === result.monthlyPayments.length - 1).map(p => ({
    year: Math.floor(p.month / 12) + 1,
    principal: p.principal,
    interest: p.interest
  }));

  return (
    <div className="space-y-6">
        {/* Controls Header */}
        <div className="flex justify-end" data-html2canvas-ignore="true">
            <button
                onClick={handleSaveImage}
                disabled={isCapturing}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all shadow-sm"
            >
                {isCapturing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                리포트 이미지 저장
            </button>
        </div>

      {/* Content */}
      <div className="space-y-6 p-2 rounded-xl">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border ${dsrBg} border-opacity-50 shadow-sm`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">DSR 비율</span>
                {result.dsrRatio <= 40 ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
            </div>
            <div className={`text-3xl font-bold ${dsrStatusColor}`}>
                {result.dsrRatio.toFixed(2)}%
            </div>
            <div className="text-xs text-slate-500 mt-1">
                {inputs.applyStressDsr ? `스트레스 금리 ${result.stressDsrRateUsed.toFixed(1)}% 적용` : `적용 금리 ${inputs.interestRate}%`}
            </div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-sm font-medium text-slate-600 mb-2">월 평균 상환액</div>
            <div className="text-2xl font-bold text-slate-900">
                {formatWon(result.avgMonthlyPayment)} <span className="text-base font-normal text-slate-500">원</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">총 상환금의 월 평균</div>
            </div>

            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className="text-sm font-medium text-slate-600 mb-2">총 이자 비용</div>
            <div className="text-2xl font-bold text-blue-600">
                {formatWon(result.totalInterest)} <span className="text-base font-normal text-slate-500">원</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">대출 기간 동안 총 이자</div>
            </div>
        </div>

        {/* AI Analysis Section */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <BrainCircuit className="w-6 h-6 text-indigo-600" />
                <h3 className="text-lg font-semibold text-indigo-900">AI 금융 분석가</h3>
            </div>
            {!aiAdvice && (
                <button
                onClick={handleAiAnalyze}
                disabled={loadingAi}
                data-html2canvas-ignore="true"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                {loadingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : "분석 받기"}
                </button>
            )}
            </div>
            
            {loadingAi && (
                <div className="text-indigo-600 text-sm animate-pulse">DSR 데이터와 최신 규제를 바탕으로 분석 중입니다...</div>
            )}

            {aiAdvice && (
            <div className="prose prose-sm text-slate-700 max-w-none bg-white p-4 rounded-lg border border-indigo-100 shadow-sm">
                <ReactMarkdown>{aiAdvice}</ReactMarkdown>
            </div>
            )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Payment Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-4">총 상환금 구성</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={[
                        { name: '원금', value: inputs.loanAmount },
                        { name: '총 이자', value: result.totalInterest }
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {/* 0: Principal, 1: Interest */}
                    <Cell key="cell-0" fill="#3b82f6" /> 
                    <Cell key="cell-1" fill="#ef4444" />
                    </Pie>
                    <RechartsTooltip formatter={(value: number) => `${formatWon(value)} 원`} />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 text-sm mt-2">
                <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>원금: {formatWon(inputs.loanAmount)}</span>
                </div>
                <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span>이자: {formatWon(result.totalInterest)}</span>
                </div>
            </div>
            </div>

            {/* Yearly Repayment Schedule */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-4">연도별 상환 추이</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    stacked
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" unit="년차" fontSize={12} tickMargin={10} />
                    <YAxis fontSize={12} tickFormatter={(val) => `${val / 10000}만`} width={45} />
                    <RechartsTooltip 
                        formatter={(value: number, name: string) => [
                            `${formatWon(value)} 원`, 
                            name === 'principal' ? '원금' : '이자'
                        ]}
                    />
                    <Legend formatter={(val) => val === 'principal' ? '원금' : '이자'} />
                    <Bar dataKey="principal" stackId="a" fill="#3b82f6" name="principal" />
                    <Bar dataKey="interest" stackId="a" fill="#cbd5e1" name="interest" />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>
      </div>
    </div>
  );
};