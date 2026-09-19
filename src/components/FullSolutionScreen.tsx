import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { FullSolutionData } from '../types';
import { MathView } from './MathView';

interface FullSolutionScreenProps {
  questionText: string;
  imageSrc?: string;
  onCompleted: () => void;
}

export const FullSolutionScreen: React.FC<FullSolutionScreenProps> = ({
  questionText,
  imageSrc,
  onCompleted,
}) => {
  const [solution, setSolution] = useState<FullSolutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchSolution() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/full-solution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: questionText,
          }),
        });

        if (!res.ok) {
          throw new Error('伺服器處理錯誤');
        }

        const data: FullSolutionData = await res.json();
        if (isMounted) {
          setSolution(data);
        }
      } catch (err: any) {
        console.error('Failed to fetch full solution:', err);
        if (isMounted) {
          setError('剛剛沒有成功讀取題目解析，請再試一次。');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    fetchSolution();

    return () => {
      isMounted = false;
    };
  }, [questionText]);

  if (isLoading) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-16 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shadow-xs">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold text-slate-800">正在整理解題方法……</h3>
          <p className="text-xs sm:text-sm text-slate-500">
            AI 老師正在進行嚴格數學驗算，確保每個步驟清晰正確
          </p>
        </div>
      </div>
    );
  }

  if (error || !solution) {
    return (
      <div className="w-full max-w-xl mx-auto px-4 py-12 text-center space-y-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-rose-900 space-y-3">
          <AlertTriangle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-sm font-medium">{error || '載入解析失敗'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl"
          >
            重新嘗試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* Target Question Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
            題目
          </span>
          <div className="text-sm font-medium text-slate-900 leading-relaxed">
            <MathView content={questionText} />
          </div>
        </div>

        {imageSrc && (
          <button
            onClick={() => setShowImageModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>原圖</span>
          </button>
        )}
      </div>

      {/* Exceeds Grade 9 Warning Card if applicable */}
      {solution.is_above_grade9 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 space-y-2 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>超綱提示（高中觀念延伸）</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            {solution.above_grade9_note ||
              '這題已經超出一般國三數學的範圍。老師會以國三能懂的推導方式說明，並清楚標記高中才會學到的觀念。'}
          </p>
        </div>
      )}

      {/* 1. 這題在考什麼？ */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-indigo-700">
          <BookOpen className="w-5 h-5" />
          <h3 className="font-bold text-base sm:text-lg text-slate-900">這題在考什麼？</h3>
        </div>
        <div className="text-sm sm:text-base text-slate-700 leading-relaxed pl-7">
          <MathView content={solution.topic} />
        </div>
      </div>

      {/* 2. 解題思路 */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-amber-600">
          <Lightbulb className="w-5 h-5" />
          <h3 className="font-bold text-base sm:text-lg text-slate-900">解題思路</h3>
        </div>
        <div className="text-sm sm:text-base text-slate-700 leading-relaxed pl-7 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-100/70">
          <MathView content={solution.thinking} />
        </div>
      </div>

      {/* 3. 詳細解題步驟 */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-2 text-slate-700">
          <Layers className="w-5 h-5 text-indigo-600" />
          <h3 className="font-bold text-base sm:text-lg text-slate-900">詳細解題步驟</h3>
        </div>

        <div className="space-y-3.5">
          {solution.steps.map((step) => (
            <div
              key={step.step_number}
              className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-7 h-7 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {step.step_number}
                </span>
                <h4 className="font-bold text-sm sm:text-base text-slate-800">
                  {step.title}
                </h4>
              </div>

              {/* Math expression block */}
              {step.math && (
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 font-mono text-sm sm:text-base overflow-x-auto text-slate-900">
                  <MathView content={step.math} />
                </div>
              )}

              {/* Explanation in plain Taiwanese Chinese */}
              <div className="text-sm text-slate-600 leading-relaxed pl-1">
                <MathView content={step.explanation} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. 答案 (Final Answer) */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-3xl p-6 text-white shadow-sm space-y-2">
        <div className="flex items-center gap-2 text-indigo-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-300" />
          <span className="text-xs font-bold uppercase tracking-wider">答案</span>
        </div>
        <div className="text-xl sm:text-2xl font-extrabold tracking-tight pt-1">
          <MathView content={solution.final_answer} />
        </div>
      </div>

      {/* 5. 檢查 (Verification) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center gap-2 text-emerald-700">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base sm:text-lg text-slate-900">檢查（驗算與條件檢查）</h3>
        </div>
        <div className="text-sm sm:text-base text-slate-700 leading-relaxed pl-7 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100/70">
          <MathView content={solution.verification} />
        </div>
      </div>

      {/* 6. 這題你要記住 (Key Takeaways) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-indigo-700">
          <Bookmark className="w-5 h-5" />
          <h3 className="font-bold text-base sm:text-lg text-slate-900">這題你要記住</h3>
        </div>
        <ul className="space-y-2 pl-7">
          {solution.takeaways.map((takeaway, idx) => (
            <li key={idx} className="text-sm sm:text-base text-slate-700 flex items-start gap-2">
              <span className="text-indigo-600 font-bold shrink-0">•</span>
              <div className="leading-relaxed">
                <MathView content={takeaway} />
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom CTA to Understanding Check */}
      <div className="pt-3">
        <button
          onClick={onCompleted}
          className="w-full min-h-[54px] py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
        >
          <span>看懂了！進行理解度檢查</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      {/* Image Modal for checking diagram */}
      {showImageModal && imageSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4"
          onClick={() => setShowImageModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
              <span className="font-bold text-slate-800 text-sm">題目照片原圖對照</span>
              <button
                onClick={() => setShowImageModal(false)}
                className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
              >
                關閉
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-900 max-h-[70vh]">
              <img src={imageSrc} alt="題目照片" className="max-w-full h-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
