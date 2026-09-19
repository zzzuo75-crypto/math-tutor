import React from 'react';
import { Play, RotateCcw, AlertTriangle, Loader2, ImageOff, CheckCircle2 } from 'lucide-react';
import { ImageQualityReport } from '../types';

export type AnalysisLoadingStage = 'idle' | 'reading' | 'checking_math';

interface ImagePreviewScreenProps {
  imageSrc: string;
  isAnalyzing: boolean;
  analysisStage?: AnalysisLoadingStage;
  qualityReport?: ImageQualityReport | null;
  multipleQuestionsDetected: boolean;
  onConfirmAnalyze: () => void;
  onRetake: () => void;
  onReselect: () => void;
}

export const ImagePreviewScreen: React.FC<ImagePreviewScreenProps> = ({
  imageSrc,
  isAnalyzing,
  analysisStage = 'idle',
  qualityReport = null,
  multipleQuestionsDetected,
  onConfirmAnalyze,
  onRetake,
  onReselect,
}) => {
  const isPoorQuality = qualityReport && (!qualityReport.can_continue || qualityReport.image_quality === 'poor');

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6 animate-in fade-in duration-300">
      {/* 1. Poor Image Quality Alert Callout */}
      {isPoorQuality && (
        <div className="p-5 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-3 shadow-xs animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <ImageOff className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h3 className="font-bold text-base text-rose-950">
                這張照片有些地方看不清楚，可能會讓數字或符號辨識錯誤。
              </h3>
              <p className="text-xs text-rose-800 leading-relaxed">
                數學題目差一個正負號、次方或數字都會變成完全不同的題目。為了守護解題正確性，我們不會用猜的：
              </p>
              {qualityReport.issues && qualityReport.issues.length > 0 && (
                <div className="p-3 bg-white/80 rounded-xl border border-rose-200/80 space-y-1 mt-2">
                  <span className="text-[11px] font-bold text-rose-900 block">影像檢查發現的問題：</span>
                  <ul className="list-disc list-inside text-xs text-rose-700 space-y-1">
                    {qualityReport.issues.map((issue, idx) => (
                      <li key={idx} className="leading-snug">
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={onRetake}
              className="py-3 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>重新拍攝</span>
            </button>
            <button
              onClick={onReselect}
              className="py-3 px-4 bg-white border border-rose-300 hover:bg-rose-100/50 text-rose-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
            >
              重新選擇圖片
            </button>
          </div>
        </div>
      )}

      {/* 2. Multiple questions alert if detected */}
      {multipleQuestionsDetected && !isPoorQuality && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3 shadow-xs animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-bold text-base text-amber-900">
                我看到這張圖片裡有不只一道題目。
              </h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                請重新拍攝或裁切，只保留你想解的那一題。一次專心解一題，效果最好喔！
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={onRetake}
              className="py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
            >
              重新拍攝
            </button>
            <button
              onClick={onReselect}
              className="py-2.5 px-4 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 font-semibold text-sm rounded-xl transition-colors cursor-pointer text-center"
            >
              重新選擇圖片
            </button>
          </div>
        </div>
      )}

      {/* Image Container Card */}
      <div className="bg-white rounded-3xl p-4 shadow-xs border border-slate-200 space-y-4">
        <div className="relative rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center max-h-[460px] border border-slate-100">
          <img
            src={imageSrc}
            alt="待辨識的數學題目"
            className="w-full h-auto object-contain max-h-[460px]"
          />

          {/* Loading overlay with two distinct phases */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-3 p-6 text-center animate-in fade-in duration-200">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
              <div className="space-y-2 max-w-xs">
                {analysisStage === 'reading' ? (
                  <>
                    <p className="text-xl font-bold tracking-wide text-white">正在讀取題目……</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      仔細讀取題目文字與數學式中
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold tracking-wide text-indigo-200">正在檢查數字和符號……</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      進行獨立雙重核對，嚴格檢查數字、次方、正負號與圖形標記
                    </p>
                  </>
                )}
              </div>

              {/* Discreet progress indicators */}
              <div className="flex items-center gap-2 pt-2">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    analysisStage === 'reading' ? 'w-8 bg-indigo-500' : 'w-4 bg-emerald-400'
                  }`}
                />
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    analysisStage === 'checking_math' ? 'w-8 bg-indigo-400 animate-pulse' : 'w-4 bg-slate-700'
                  }`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons when not in poor quality or multiple question error */}
        {!multipleQuestionsDetected && !isPoorQuality && (
          <div className="space-y-3 pt-1">
            <button
              disabled={isAnalyzing}
              onClick={onConfirmAnalyze}
              className="w-full min-h-[52px] py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-white font-bold text-base rounded-2xl shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>
                    {analysisStage === 'reading' ? '正在讀取題目……' : '正在檢查數字和符號……'}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 fill-current" />
                  <span>開始辨識題目</span>
                </>
              )}
            </button>

            {!isAnalyzing && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onRetake}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>重拍照片</span>
                </button>
                <button
                  onClick={onReselect}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span>從相簿換一張</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
