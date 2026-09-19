import React, { useState } from 'react';
import {
  CheckCircle2,
  HelpCircle,
  Dumbbell,
  Camera,
  Send,
  Loader2,
  Sparkles,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import { MathView } from './MathView';
import { PracticeProblemData, PracticeCheckResponse } from '../types';

interface UnderstandingCheckScreenProps {
  questionText: string;
  onNextProblem: () => void;
}

type CheckSubView = 'MENU' | 'UNDERSTOOD' | 'STEP_CONFUSED' | 'PRACTICE';

export const UnderstandingCheckScreen: React.FC<UnderstandingCheckScreenProps> = ({
  questionText,
  onNextProblem,
}) => {
  const [subView, setSubView] = useState<CheckSubView>('MENU');

  // "有一步不懂" state
  const [confusedText, setConfusedText] = useState('');
  const [isExplainingStep, setIsExplainingStep] = useState(false);
  const [stepExplanation, setStepExplanation] = useState<string | null>(null);

  // "出一題讓我試試" state
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
  const [practiceProblem, setPracticeProblem] = useState<PracticeProblemData | null>(null);
  const [studentPracticeAnswer, setStudentPracticeAnswer] = useState('');
  const [isCheckingPractice, setIsCheckingPractice] = useState(false);
  const [practiceFeedback, setPracticeFeedback] = useState<PracticeCheckResponse | null>(null);
  const [practiceAttempt, setPracticeAttempt] = useState(1);
  const [showPracticeHint, setShowPracticeHint] = useState(false);

  // Handle "懂了"
  const handleSelectUnderstood = () => {
    setSubView('UNDERSTOOD');
  };

  // Handle "有一步不懂"
  const handleSelectStepConfused = () => {
    setSubView('STEP_CONFUSED');
  };

  const submitStepConfusion = async () => {
    if (!confusedText.trim() || isExplainingStep) return;
    setIsExplainingStep(true);
    setStepExplanation(null);

    try {
      const res = await fetch('/api/explain-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText,
          student_confusion: confusedText.trim(),
        }),
      });

      const data = await res.json();
      setStepExplanation(data.explanation || '老師已為你重新整理這一步！');
    } catch (err) {
      console.error('Failed to explain step:', err);
      setStepExplanation('剛剛老師連線時卡住了，請再點一次送出！');
    } finally {
      setIsExplainingStep(false);
    }
  };

  // Handle "出一題讓我試試"
  const handleSelectPractice = async () => {
    setSubView('PRACTICE');
    if (practiceProblem) return; // already loaded

    setIsGeneratingPractice(true);
    try {
      const res = await fetch('/api/practice-problem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText,
        }),
      });

      const data: PracticeProblemData = await res.json();
      setPracticeProblem(data);
    } catch (err) {
      console.error('Failed to generate practice:', err);
    } finally {
      setIsGeneratingPractice(false);
    }
  };

  const handleCheckPracticeAnswer = async () => {
    if (!studentPracticeAnswer.trim() || !practiceProblem || isCheckingPractice) return;

    setIsCheckingPractice(true);
    try {
      const res = await fetch('/api/check-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problem_text: practiceProblem.problem_text,
          student_answer: studentPracticeAnswer.trim(),
          attempt: practiceAttempt,
        }),
      });

      const data: PracticeCheckResponse = await res.json();
      setPracticeFeedback(data);
      if (!data.is_correct) {
        setPracticeAttempt((prev) => prev + 1);
      }
    } catch (err) {
      console.error('Failed to check practice answer:', err);
    } finally {
      setIsCheckingPractice(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* 1. Main Choice Menu */}
      {subView === 'MENU' && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>學習驗收</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              這題你理解了嗎？
            </h2>
            <p className="text-sm text-slate-600">
              誠實感受自己的學習狀況，才能真正把分數拿下來
            </p>
          </div>

          <div className="space-y-3.5">
            {/* Button 1: 懂了 */}
            <button
              onClick={handleSelectUnderstood}
              className="w-full text-left p-5 bg-white hover:bg-emerald-50/50 border-2 border-emerald-200 hover:border-emerald-500 rounded-3xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-950">
                    懂了
                  </h3>
                  <p className="text-xs text-slate-500">
                    這個觀念我已經完全搞清楚了，準備挑戰下一題！
                  </p>
                </div>
              </div>
              <span className="text-emerald-700 font-bold text-sm px-3 py-1 rounded-xl bg-emerald-50 shrink-0">
                完成 →
              </span>
            </button>

            {/* Button 2: 有一步不懂 */}
            <button
              onClick={handleSelectStepConfused}
              className="w-full text-left p-5 bg-white hover:bg-amber-50/50 border-2 border-amber-200 hover:border-amber-500 rounded-3xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <HelpCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-950">
                    有一步不懂
                  </h3>
                  <p className="text-xs text-slate-500">
                    某個特定步驟有點跳步或轉不過來，想請老師再講一次
                  </p>
                </div>
              </div>
              <span className="text-amber-800 font-bold text-sm px-3 py-1 rounded-xl bg-amber-50 shrink-0">
                提問 →
              </span>
            </button>

            {/* Button 3: 出一題讓我試試 */}
            <button
              onClick={handleSelectPractice}
              className="w-full text-left p-5 bg-white hover:bg-indigo-50/50 border-2 border-indigo-200 hover:border-indigo-500 rounded-3xl shadow-xs transition-all active:scale-[0.99] flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Dumbbell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-950">
                    出一題讓我試試
                  </h3>
                  <p className="text-xs text-slate-500">
                    生成一道同觀念類似題，自己動手算算看檢驗實力
                  </p>
                </div>
              </div>
              <span className="text-indigo-700 font-bold text-sm px-3 py-1 rounded-xl bg-indigo-50 shrink-0">
                自我測驗 →
              </span>
            </button>
          </div>
        </div>
      )}

      {/* 2. SubView: "懂了" Completion Screen */}
      {subView === 'UNDERSTOOD' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs text-center space-y-6 animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-md">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-extrabold text-slate-900">太棒了！觀念順利搞懂！</h3>
            <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
              數學靠的是日積月累的踏實理解。準備好解下一道難題了嗎？
            </p>
          </div>

          <button
            onClick={onNextProblem}
            className="w-full min-h-[52px] py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Camera className="w-5 h-5" />
            <span>拍下一題</span>
          </button>
        </div>
      )}

      {/* 3. SubView: "有一步不懂" Detailed Step Clarification */}
      {subView === 'STEP_CONFUSED' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-amber-700 font-bold">
              <HelpCircle className="w-5 h-5" />
              <span>哪一步讓你卡住？</span>
            </div>
            <button
              onClick={() => setSubView('MENU')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              返回選擇
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500">
              請用你自己習慣的方式描述，例如：「為什麼第二步可以直接十字交乘？」或「角 AOB 為什麼是兩倍？」
            </p>
            <textarea
              rows={3}
              value={confusedText}
              onChange={(e) => setConfusedText(e.target.value)}
              placeholder="輸入你覺得卡住或不理解的地方..."
              className="w-full p-3.5 text-sm text-slate-900 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl outline-hidden resize-none transition-all"
            />
          </div>

          <button
            disabled={!confusedText.trim() || isExplainingStep}
            onClick={submitStepConfusion}
            className="w-full py-3 px-5 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {isExplainingStep ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>老師正在為你單獨解說這一步……</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>請老師針對這點深入解說</span>
              </>
            )}
          </button>

          {/* Teacher's focused explanation result */}
          {stepExplanation && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-800 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                <Lightbulb className="w-4 h-4 text-amber-600" />
                <span>老師的白話重點解說：</span>
              </div>
              <div className="text-sm leading-relaxed">
                <MathView content={stepExplanation} />
              </div>
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-amber-200/60">
                <button
                  onClick={() => setSubView('MENU')}
                  className="text-xs font-semibold px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
                >
                  懂了，回選項
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. SubView: "出一題讓我試試" Similar Practice Problem */}
      {subView === 'PRACTICE' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-700 font-bold">
              <Dumbbell className="w-5 h-5" />
              <span>同概念會考練習題</span>
            </div>
            <button
              onClick={() => setSubView('MENU')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              返回選項
            </button>
          </div>

          {isGeneratingPractice ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600 mx-auto" />
              <p className="text-sm text-slate-600 font-medium">正在為你設計同觀念會考題……</p>
            </div>
          ) : practiceProblem ? (
            <div className="space-y-4">
              {/* Problem Statement */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider block">
                  題目：
                </span>
                <div className="text-base text-slate-900 font-medium leading-relaxed">
                  <MathView content={practiceProblem.problem_text} />
                </div>
              </div>

              {/* Hint button */}
              <div>
                <button
                  onClick={() => setShowPracticeHint(!showPracticeHint)}
                  className="text-xs text-amber-700 hover:text-amber-800 font-semibold flex items-center gap-1"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span>{showPracticeHint ? '隱藏提示' : '想看提示嗎？'}</span>
                </button>
                {showPracticeHint && (
                  <p className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-xl mt-1.5 border border-amber-200">
                    {practiceProblem.hint}
                  </p>
                )}
              </div>

              {/* Student answer input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">你的計算答案：</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={studentPracticeAnswer}
                    onChange={(e) => setStudentPracticeAnswer(e.target.value)}
                    placeholder="輸入你算出的答案（例如：x = 2 或 3）"
                    className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-600 rounded-xl outline-hidden"
                  />
                  <button
                    disabled={!studentPracticeAnswer.trim() || isCheckingPractice}
                    onClick={handleCheckPracticeAnswer}
                    className="py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {isCheckingPractice ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>送出批改</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Teacher Feedback Box */}
              {practiceFeedback && (
                <div
                  className={`p-4 rounded-2xl border space-y-2 animate-in fade-in duration-200 ${
                    practiceFeedback.is_correct
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {practiceFeedback.is_correct ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>太厲害了！回答正確！</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                        <span>再檢查看看這一步：</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs leading-relaxed">
                    <MathView content={practiceFeedback.teacher_message} />
                  </div>

                  {practiceFeedback.explained_answer && (
                    <div className="p-3 bg-white/80 rounded-xl border border-slate-200 text-slate-800 text-xs mt-2">
                      <span className="font-bold block mb-1">參考解析：</span>
                      <MathView content={practiceFeedback.explained_answer} />
                    </div>
                  )}

                  {practiceFeedback.is_correct && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={onNextProblem}
                        className="text-xs font-bold px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors"
                      >
                        完成練習，拍下一題 →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-rose-600">無法載入練習題，請返回重試。</p>
          )}
        </div>
      )}
    </div>
  );
};
