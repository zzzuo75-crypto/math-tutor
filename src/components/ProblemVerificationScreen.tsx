import React, { useState, useEffect } from 'react';
import {
  Check,
  RotateCcw,
  AlertTriangle,
  Eye,
  Sparkles,
  HelpCircle,
  Layers,
  CheckCircle2,
  AlertCircle,
  Edit3,
  ShieldCheck,
} from 'lucide-react';
import { RecognitionResult, ConfirmedProblem, DisagreementItem, DiagramInfo } from '../types';
import { MathView } from './MathView';

interface ProblemVerificationScreenProps {
  imageSrc: string;
  recognition: RecognitionResult;
  onConfirmProblem: (confirmedText: string, confirmedObject: ConfirmedProblem) => void;
  onRetake: () => void;
}

export const ProblemVerificationScreen: React.FC<ProblemVerificationScreenProps> = ({
  imageSrc,
  recognition,
  onConfirmProblem,
  onRetake,
}) => {
  const [editedText, setEditedText] = useState(recognition.question_text || '');
  const [showFullImageModal, setShowFullImageModal] = useState(false);
  const [showFormulaHelper, setShowFormulaHelper] = useState(false);

  // Resolved disagreements state: map from location or index to selected value
  const [resolvedChoices, setResolvedChoices] = useState<Record<number, string>>({});
  const [customInputIndex, setCustomInputIndex] = useState<number | null>(null);
  const [customInputValue, setCustomInputValue] = useState('');

  // Geometry diagram state that can be edited by student
  const [diagramInfo, setDiagramInfo] = useState<DiagramInfo>(
    recognition.diagram_information || {
      points: [],
      angles: [],
      lengths: [],
      relations: [],
    }
  );
  const [editingGeometry, setEditingGeometry] = useState(false);

  // When a student picks an option for a disagreement
  const handleSelectOption = (index: number, optionValue: string, disagreement: DisagreementItem) => {
    setResolvedChoices((prev) => ({ ...prev, [index]: optionValue }));
    setCustomInputIndex(null);

    // Smart replace in the editedText:
    // If the pass_1 value or placeholder exists, replace it
    setEditedText((prev) => {
      // 1. If text has a [?] marker, replace first [?]
      if (prev.includes('[?]')) {
        return prev.replace('[?]', optionValue);
      }
      // 2. If text includes pass_1, replace first occurrence
      if (disagreement.pass_1 && prev.includes(disagreement.pass_1)) {
        return prev.replace(disagreement.pass_1, optionValue);
      }
      // 3. Otherwise, append or let student adjust in textarea
      return prev;
    });
  };

  const handleApplyCustomInput = (index: number, disagreement: DisagreementItem) => {
    if (!customInputValue.trim()) return;
    handleSelectOption(index, customInputValue.trim(), disagreement);
    setCustomInputValue('');
  };

  const insertSymbol = (sym: string) => {
    setEditedText((prev) => prev + sym);
  };

  // Build the locked confirmed problem object
  const handleFinalConfirm = () => {
    const authoritativeText = editedText.trim();
    if (!authoritativeText) return;

    const confirmedObj: ConfirmedProblem = {
      status: 'CONFIRMED',
      confirmed_question: authoritativeText,
      confirmed_by_student: true,
      diagram_information: recognition.is_geometry ? diagramInfo : undefined,
      is_geometry: recognition.is_geometry,
    };

    onConfirmProblem(authoritativeText, confirmedObj);
  };

  const status = recognition.verification_status || 'verified';
  const hasDisagreements = recognition.disagreements && recognition.disagreements.length > 0;
  const isUnreadable = status === 'unreadable';
  const isVerified = status === 'verified' && !hasDisagreements && !isUnreadable;

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 space-y-5 animate-in fade-in duration-300">
      {/* 1. Header Title & Tone */}
      <div className="text-center space-y-2">
        {isVerified && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>雙重核對一致</span>
          </div>
        )}

        {status === 'needs_confirmation' && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>需你協助確認關鍵符號</span>
          </div>
        )}

        {isUnreadable && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>部分字跡無法可靠辨識</span>
          </div>
        )}

        <h2 className="text-2xl font-bold text-slate-900">
          {isVerified && '我辨識到的題目如下'}
          {status === 'needs_confirmation' && '有一個地方需要你確認'}
          {isUnreadable && '這個地方我真的看不清楚'}
        </h2>

        <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
          {isVerified && '已完成雙重核對。即使 AI 核對一致，解題前仍請你親自核對每個數字與符號。'}
          {status === 'needs_confirmation' && '數學符號差一點就差很多！請點選下方可能的選項，或手動修正。'}
          {isUnreadable && '字跡過於模糊或反光，我們絕不瞎猜。請手動輸入題目或點選下方重新拍照。'}
        </p>
      </div>

      {/* 2. CASE B: NEEDS CONFIRMATION - Interactive Disagreements UI */}
      {hasDisagreements && (
        <div className="space-y-3">
          {recognition.disagreements.map((d, idx) => {
            const isResolved = resolvedChoices[idx] !== undefined;
            const chosenVal = resolvedChoices[idx];
            // Combine pass_1, possible_value and suggested_options uniquely
            const options = Array.from(
              new Set([d.pass_1, d.possible_value, ...(d.suggested_options || [])])
            ).filter(Boolean);

            return (
              <div
                key={idx}
                className={`p-4 rounded-2xl border-2 transition-all shadow-xs ${
                  isResolved
                    ? 'bg-emerald-50/70 border-emerald-300'
                    : 'bg-amber-50 border-amber-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold shrink-0">
                      ?
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900">
                        {d.location || '符號不確定'} 我不太確定
                      </h4>
                      <p className="text-xs text-amber-800 mt-0.5">{d.reason}</p>
                    </div>
                  </div>

                  {isResolved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                      <Check className="w-3 h-3 text-emerald-600" />
                      已選：{chosenVal}
                    </span>
                  )}
                </div>

                {/* Candidate choices */}
                <div className="mt-3 pt-3 border-t border-amber-200/80 space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">這裡可能是：</span>
                  <div className="flex flex-wrap items-center gap-2">
                    {options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(idx, opt, d)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-2xs cursor-pointer active:scale-95 flex items-center gap-1.5 ${
                          chosenVal === opt
                            ? 'bg-indigo-600 text-white border-2 border-indigo-600 ring-2 ring-indigo-200'
                            : 'bg-white hover:bg-amber-100 text-slate-800 border border-amber-300'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}

                    {/* "自己輸入" button */}
                    <button
                      type="button"
                      onClick={() => setCustomInputIndex(customInputIndex === idx ? null : idx)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border shadow-2xs cursor-pointer flex items-center gap-1 ${
                        customInputIndex === idx
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                          : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>自己輸入</span>
                    </button>
                  </div>

                  {/* Inline custom input field */}
                  {customInputIndex === idx && (
                    <div className="flex items-center gap-2 pt-2 animate-in fade-in duration-150">
                      <input
                        type="text"
                        value={customInputValue}
                        onChange={(e) => setCustomInputValue(e.target.value)}
                        placeholder={`請輸入正確的 ${d.location}...`}
                        className="flex-1 px-3 py-2 bg-white text-sm border border-slate-300 rounded-xl focus:outline-hidden focus:border-indigo-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleApplyCustomInput(idx, d);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleApplyCustomInput(idx, d)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-2xs"
                      >
                        確定
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. CASE C: UNREADABLE Alert if applicable */}
      {isUnreadable && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 text-rose-900 space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm text-rose-950">這個地方我真的看不清楚</h4>
              <p className="text-xs text-rose-800 mt-1 leading-relaxed">
                {recognition.unreadable_reason || '照片中重要數字或符號無法判斷。我們絕不用猜的，請直接在下方手動補齊，或重新拍一張清楚的照片。'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. GEOMETRY CONFIRMATION SECTION (Section 13 & 15) */}
      {recognition.is_geometry && (
        <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <h4 className="font-bold text-sm text-blue-900">我從圖中讀到</h4>
            </div>
            <button
              onClick={() => setEditingGeometry(!editingGeometry)}
              className="text-xs font-semibold text-blue-700 hover:text-blue-900 flex items-center gap-1"
            >
              <Edit3 className="w-3 h-3" />
              <span>{editingGeometry ? '完成調整' : '修改圖形資訊'}</span>
            </button>
          </div>

          <div className="bg-white/80 p-3 rounded-xl border border-blue-200/80 space-y-2 text-xs">
            {/* Display points */}
            {diagramInfo.points && diagramInfo.points.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-700">頂點標記：</span>
                <span className="font-mono text-slate-900">{diagramInfo.points.join(', ')}</span>
              </div>
            )}

            {/* Display angles */}
            {diagramInfo.angles && diagramInfo.angles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700">角度標記：</span>
                {diagramInfo.angles.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 bg-blue-100/70 text-blue-900 rounded font-mono">
                    ∠{a.name} = {a.value}
                  </span>
                ))}
              </div>
            )}

            {/* Display lengths */}
            {diagramInfo.lengths && diagramInfo.lengths.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700">線段長度：</span>
                {diagramInfo.lengths.map((l, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-100/70 text-indigo-900 rounded font-mono">
                    {l.segment} = {l.value}
                  </span>
                ))}
              </div>
            )}

            {/* Display relations */}
            {diagramInfo.relations && diagramInfo.relations.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-700">已知關係：</span>
                {diagramInfo.relations.map((r, i) => (
                  <span key={i} className="px-2 py-0.5 bg-emerald-100/70 text-emerald-900 rounded font-mono">
                    {r}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
            請確認圖形資訊是否正確。注意：幾何解題只依據圖形或題目明確標註的條件，絕不憑視覺目測推斷未標記的直角或等長。
          </p>
        </div>
      )}

      {/* 5. Main Card: Photo preview thumbnail + Editable Textarea + Live LaTeX Preview */}
      <div className="bg-white rounded-3xl p-5 shadow-xs border border-slate-200 space-y-4">
        {/* Original photo strip with full image modal */}
        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <img
              src={imageSrc}
              alt="題目原圖"
              className="w-14 h-14 object-cover rounded-xl border border-slate-200 shadow-2xs cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowFullImageModal(true)}
            />
            <div>
              <span className="text-xs font-bold text-slate-700 block">題目照片原圖</span>
              <span className="text-[11px] text-slate-500">解題全程皆保留原圖隨時核對</span>
            </div>
          </div>

          <button
            onClick={() => setShowFullImageModal(true)}
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-white border border-indigo-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-indigo-50/50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>查看大圖</span>
          </button>
        </div>

        {/* Editable Text Area (Always remains editable!) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span>題目文字與算式（隨時可手動修正）：</span>
            </label>
            <button
              onClick={() => setShowFormulaHelper(!showFormulaHelper)}
              className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showFormulaHelper ? '收合常用符號' : '插入常用符號'}</span>
            </button>
          </div>

          {/* Quick math symbols helper */}
          {showFormulaHelper && (
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap gap-1.5 animate-in fade-in duration-150">
              {['²', '³', '√', 'π', '∠', '△', '⊥', '∥', '°', '±', '≠', '≤', '≥', 'x', 'y'].map(
                (sym) => (
                  <button
                    key={sym}
                    type="button"
                    onClick={() => insertSymbol(sym)}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg text-xs font-mono font-semibold text-slate-800 hover:text-indigo-700 shadow-2xs active:scale-95"
                  >
                    {sym}
                  </button>
                )
              )}
            </div>
          )}

          <textarea
            rows={4}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full p-3.5 text-base text-slate-800 bg-slate-50 focus:bg-white border-2 border-slate-200 focus:border-indigo-500 rounded-2xl outline-hidden font-sans transition-all resize-y shadow-2xs leading-relaxed"
            placeholder="請核對並修正題目內容..."
          />
        </div>

        {/* Live Math Render Preview */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/40 border border-indigo-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
              即時排版預覽
            </span>
            <span className="text-[11px] text-indigo-600">LaTeX / 數學符號呈現</span>
          </div>
          <div className="bg-white p-3 rounded-xl border border-indigo-100/60 text-slate-800 text-sm">
            <MathView content={editedText || '（尚未輸入題目）'} />
          </div>
        </div>

        {/* Mandatory Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            disabled={!editedText.trim()}
            onClick={handleFinalConfirm}
            className="w-full min-h-[52px] py-3.5 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 text-white font-bold text-base rounded-2xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Check className="w-5 h-5" />
            <span>確認正確，開始解題</span>
          </button>

          <button
            type="button"
            onClick={onRetake}
            className="w-full py-2.5 px-4 text-slate-600 hover:text-slate-800 font-medium text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-500" />
            <span>重新拍照</span>
          </button>
        </div>
      </div>

      {/* Full Image Modal for inspection */}
      {showFullImageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowFullImageModal(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-sm">原始題目照片核對</h4>
              <button
                onClick={() => setShowFullImageModal(false)}
                className="text-xs font-semibold px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700"
              >
                關閉
              </button>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-slate-900 max-h-[70vh]">
              <img src={imageSrc} alt="放大核對" className="max-w-full h-auto object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
