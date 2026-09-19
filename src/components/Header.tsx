import React from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import { AppState } from '../types';

interface HeaderProps {
  currentState: AppState;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentState, onReset }) => {
  const getStepLabel = () => {
    switch (currentState) {
      case 'IMAGE_UPLOAD':
        return '上傳題目';
      case 'IMAGE_REVIEW':
      case 'NEED_CLARIFICATION':
        return '確認題目';
      case 'MODE_SELECTION':
        return '選擇學習方式';
      case 'TUTOR_MODE':
        return '家教引導模式';
      case 'FULL_SOLUTION':
        return '完整解析模式';
      case 'UNDERSTANDING_CHECK':
        return '理解度檢查';
      case 'PRACTICE':
        return '類似題練習';
      default:
        return '';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200/80 px-4 py-3 shadow-xs">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-800 leading-tight">
              台灣國三 AI 數學老師
            </h1>
            <span className="text-xs text-slate-500 font-medium">
              國中三年級會考複習專用
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentState !== 'IMAGE_UPLOAD' && (
            <span className="hidden sm:inline-flex text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              {getStepLabel()}
            </span>
          )}

          {currentState !== 'IMAGE_UPLOAD' && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              title="重新拍照或選擇新題目"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>換一題</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
