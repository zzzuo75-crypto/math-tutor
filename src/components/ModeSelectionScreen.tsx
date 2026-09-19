import React from 'react';
import { Sparkles, BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import { MathView } from './MathView';

interface ModeSelectionScreenProps {
  confirmedQuestion: string;
  onSelectMode: (mode: 'TUTOR_MODE' | 'FULL_SOLUTION') => void;
}

export const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({
  confirmedQuestion,
  onSelectMode,
}) => {
  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      {/* Target Question pill card */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
          即將解題的題目：
        </span>
        <div className="text-sm font-medium text-slate-800 line-clamp-3">
          <MathView content={confirmedQuestion} />
        </div>
      </div>

      {/* Heading */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          你想怎麼學這題？
        </h2>
        <p className="text-sm sm:text-base text-slate-600">
          選擇最適合你現在狀態的學習節奏
        </p>
      </div>

      {/* Two Large Mode Cards */}
      <div className="space-y-4 pt-2">
        {/* Option A: 帶我一步一步做 */}
        <button
          onClick={() => onSelectMode('TUTOR_MODE')}
          className="w-full text-left p-6 bg-gradient-to-br from-white to-indigo-50/50 hover:to-indigo-50 border-2 border-indigo-200 hover:border-indigo-500 rounded-3xl shadow-xs transition-all active:scale-[0.99] group cursor-pointer relative overflow-hidden"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                  推薦首選
                </span>
                <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-950">
                  帶我一步一步做
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                像老師一樣提示我，讓我自己算出答案。
              </p>
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold pt-1">
                <span>啟發引導・答錯有提示・培養真正解題實力</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </button>

        {/* Option B: 直接看完整解析 */}
        <button
          onClick={() => onSelectMode('FULL_SOLUTION')}
          className="w-full text-left p-6 bg-white hover:bg-slate-50/80 border-2 border-slate-200 hover:border-slate-400 rounded-3xl shadow-xs transition-all active:scale-[0.99] group cursor-pointer"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs group-hover:bg-slate-200 transition-colors">
              <BookOpen className="w-6 h-6" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-150 text-slate-700">
                  快速對照
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  直接看完整解析
                </h3>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                一次看完整的解題方法與答案。
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                <span>含觀念要點・步驟說明・完整驗算與重點提醒</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </button>
      </div>

      <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
        <HelpCircle className="w-3.5 h-3.5" />
        <span>看完解析後，隨時可以出一題類似題讓你親自練習檢驗</span>
      </div>
    </div>
  );
};
