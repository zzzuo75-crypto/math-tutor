import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, AlertCircle, CheckCircle2, HelpCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { MathView } from './MathView';
import { TutorStepResponse } from '../types';

interface Message {
  id: string;
  role: 'teacher' | 'student';
  content: string;
  isCorrect?: boolean;
  hintLevel?: number;
  stepNumber?: number;
}

interface GuidedTutorScreenProps {
  questionText: string;
  imageSrc?: string;
  onCompleted: () => void;
}

export const GuidedTutorScreen: React.FC<GuidedTutorScreenProps> = ({
  questionText,
  imageSrc,
  onCompleted,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [attempt, setAttempt] = useState(1);
  const [isComplete, setIsComplete] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Initial tutor kickoff call
  useEffect(() => {
    let isMounted = true;

    async function initTutor() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/guided-tutor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question_text: questionText,
            current_step: 1,
            attempt: 1,
            history: [],
          }),
        });
        const data: TutorStepResponse = await res.json();
        if (isMounted) {
          setCurrentStep(data.current_step || 1);
          setAttempt(data.attempt || 1);
          setIsComplete(data.is_complete || false);

          const initialMsg: Message = {
            id: 'init-teacher',
            role: 'teacher',
            content: data.teacher_message,
            stepNumber: data.current_step || 1,
          };
          setMessages([initialMsg]);
        }
      } catch (err) {
        console.error('Failed to init tutor:', err);
        if (isMounted) {
          setMessages([
            {
              id: 'err-1',
              role: 'teacher',
              content: '你好！我們先來仔細看看這道題目。這題在考什麼核心觀念呢？先試著把你的想法告訴我。',
              stepNumber: 1,
            },
          ]);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initTutor();

    return () => {
      isMounted = false;
    };
  }, [questionText]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputValue).trim();
    if (!textToSend || isLoading) return;

    setInputValue('');

    const studentMsg: Message = {
      id: `student-${Date.now()}`,
      role: 'student',
      content: textToSend,
    };

    const newMessages = [...messages, studentMsg];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/guided-tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText,
          current_step: currentStep,
          attempt: attempt,
          student_input: textToSend,
          history: historyPayload,
        }),
      });

      const data: TutorStepResponse = await res.json();

      setCurrentStep(data.current_step || currentStep);
      setAttempt(data.attempt || 1);
      setIsComplete(data.is_complete || false);

      const teacherReply: Message = {
        id: `teacher-${Date.now()}`,
        role: 'teacher',
        content: data.teacher_message,
        isCorrect: data.student_answer_correct,
        hintLevel: data.hint_level,
        stepNumber: data.current_step,
      };

      setMessages((prev) => [...prev, teacherReply]);
    } catch (err) {
      console.error('Error during tutor turn:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'teacher',
          content: '老師剛剛網路卡了一下，請再送出一次你的答案喔！',
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-3 sm:px-4 py-4 space-y-4 animate-in fade-in duration-300">
      {/* Sticky top mini-bar with question & image modal toggle */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 shrink-0">
            步驟 {currentStep}
          </span>
          <div className="text-xs text-slate-700 truncate font-medium">
            <MathView content={questionText} inline />
          </div>
        </div>

        {imageSrc && (
          <button
            onClick={() => setShowImageModal(true)}
            className="flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-indigo-700 bg-slate-100 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg shrink-0 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>對照原圖</span>
          </button>
        )}
      </div>

      {/* Messages Thread Container */}
      <div className="space-y-3.5 min-h-[380px] pb-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.role === 'student' ? 'items-end' : 'items-start'
            } animate-in fade-in duration-200`}
          >
            {/* Sender Label */}
            <div className="text-[11px] font-medium text-slate-400 mb-1 px-1 flex items-center gap-1">
              {msg.role === 'teacher' ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
                  <span>AI 數學老師</span>
                  {msg.hintLevel && msg.hintLevel > 0 && (
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">
                      提示 {msg.hintLevel}
                    </span>
                  )}
                </>
              ) : (
                <span>你</span>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-2xs ${
                msg.role === 'student'
                  ? 'bg-indigo-600 text-white rounded-tr-xs'
                  : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
              }`}
            >
              {/* Correct / Check chip indicator */}
              {msg.isCorrect === true && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mb-2 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>回答正確！</span>
                </div>
              )}

              {msg.isCorrect === false && msg.hintLevel && (
                <div className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md mb-2 border border-amber-200">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>我們再檢查一下這一步</span>
                </div>
              )}

              <MathView content={msg.content} />
            </div>
          </div>
        ))}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex flex-col items-start animate-in fade-in duration-150">
            <div className="text-[11px] font-medium text-slate-400 mb-1 px-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
              <span>AI 數學老師</span>
            </div>
            <div className="bg-white rounded-2xl rounded-tl-xs p-3.5 border border-slate-200 flex items-center gap-2.5 text-slate-600 text-sm shadow-2xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>讓我看看你的想法……</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Completion Banner when isComplete */}
      {isComplete ? (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 text-emerald-950 space-y-3 text-center shadow-xs animate-in zoom-in-95 duration-300">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-emerald-900">太棒了！這道題目解完了！</h3>
            <p className="text-xs sm:text-sm text-emerald-800">
              透過自己的思考與一步步推導，你已經掌握了這題的核心觀念。
            </p>
          </div>
          <button
            onClick={onCompleted}
            className="w-full py-3.5 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl shadow-xs transition-colors cursor-pointer"
          >
            下一步：理解度檢查 →
          </button>
        </div>
      ) : (
        /* Interactive Input & Quick Helper Chips */
        <div className="space-y-2 pt-1">
          {/* Quick reply suggestions */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              disabled={isLoading}
              onClick={() => handleSendMessage('我不知道，可以給我提示嗎？')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 whitespace-nowrap font-medium transition-colors cursor-pointer"
            >
              💡 我不知道，請給提示
            </button>
            <button
              disabled={isLoading}
              onClick={() => handleSendMessage('我算出來了，請看：')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-700 whitespace-nowrap font-medium transition-colors cursor-pointer"
            >
              ✍️ 我算出來了
            </button>
            <button
              disabled={isLoading}
              onClick={() => handleSendMessage('請直接告訴我答案')}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 whitespace-nowrap font-medium transition-colors cursor-pointer"
            >
              ⚡ 直接告訴我答案
            </button>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 bg-white p-2 rounded-2xl border-2 border-slate-200 focus-within:border-indigo-600 shadow-2xs transition-colors"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              placeholder="輸入你的答案或想法..."
              className="flex-1 px-3 py-2 text-base text-slate-900 bg-transparent outline-hidden font-sans"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="min-h-[44px] px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>送出答案</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

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
