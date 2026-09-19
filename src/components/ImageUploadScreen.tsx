import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, BookOpen, Upload, HelpCircle, CheckCircle2 } from 'lucide-react';
import { SAMPLE_QUESTIONS, SampleQuestion } from '../data/sampleQuestions';

interface ImageUploadScreenProps {
  onImageSelected: (base64: string, mimeType: string, sampleData?: SampleQuestion) => void;
}

export const ImageUploadScreen: React.FC<ImageUploadScreenProps> = ({ onImageSelected }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Resize and compress helper to keep mobile network snappy & API cost efficient
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('請上傳圖檔（JPG、PNG 或 WEBP）');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Target max dimension ~1600px for clear math symbol reading without bloat
        const maxDimension = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          onImageSelected(e.target?.result as string, file.type);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.88);
        onImageSelected(compressedBase64, 'image/jpeg');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Convert SVG preview into an image for testing sample questions
  const selectSampleQuestion = (sample: SampleQuestion) => {
    // Generate clean canvas image for sample question
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 400);

      // Grid background like notebook
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1;
      for (let x = 0; x < 800; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 400);
        ctx.stroke();
      }
      for (let y = 0; y < 400; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(800, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 26px "Noto Sans TC", sans-serif';
      ctx.fillText(sample.title, 40, 70);

      ctx.fillStyle = '#334155';
      ctx.font = '22px "Noto Sans TC", sans-serif';

      // Wrap text
      const cleanText = sample.question_text.replace(/\$/g, '');
      const words = cleanText.split('');
      let line = '';
      let y = 140;
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > 720 && n > 0) {
          ctx.fillText(line, 40, y);
          line = words[n];
          y += 42;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 40, y);

      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      onImageSelected(base64, 'image/jpeg', sample);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Hero section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold">
          <BookOpen className="w-3.5 h-3.5" />
          <span>國中三年級・會考數學 AI 家教</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          數學不會？拍給我看。
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-md mx-auto leading-relaxed">
          拍下一道數學題，我會先確認題目，再陪你一步一步解。
        </p>
      </div>

      {/* Main Upload Actions */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`bg-white rounded-3xl p-6 sm:p-8 shadow-xs border-2 transition-all ${
          isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-200/90'
        }`}
      >
        <div className="space-y-4">
          {/* Primary Button: 拍攝題目 */}
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="w-full min-h-[56px] py-4 px-6 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-lg rounded-2xl shadow-sm flex items-center justify-center gap-3 transition-transform active:scale-[0.99] cursor-pointer"
          >
            <Camera className="w-6 h-6" />
            <span>拍攝題目</span>
          </button>

          {/* Secondary Button: 從相簿選擇 */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full min-h-[52px] py-3.5 px-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-semibold text-base rounded-2xl flex items-center justify-center gap-3 transition-colors cursor-pointer"
          >
            <ImageIcon className="w-5 h-5 text-slate-600" />
            <span>從相簿選擇</span>
          </button>

          {/* Supporting Note */}
          <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 text-center">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>一次上傳一道題目，照片越清楚，辨識越準確。</span>
          </div>
        </div>

        {/* Drag and drop hint for desktop */}
        <div className="hidden sm:block mt-6 pt-5 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>電腦版亦可直接拖曳圖片至此處</span>
          </p>
        </div>
      </div>

      {/* Quick Test Samples */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            或點選範例題立即體驗
          </span>
          <span className="text-xs text-indigo-600 font-medium">免拍照快速測試</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SAMPLE_QUESTIONS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => selectSampleQuestion(sample)}
              className="text-left p-3.5 rounded-2xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-xs transition-all active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors">
                  {sample.category}
                </span>
                <span className="text-xs text-indigo-600 font-medium group-hover:underline">
                  測試此題 →
                </span>
              </div>
              <h4 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-950 line-clamp-1">
                {sample.title}
              </h4>
              <p className="text-xs text-slate-500 font-mono mt-1 line-clamp-1 bg-slate-50 px-2 py-1 rounded">
                {sample.svgPreview}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Feature badges */}
      <div className="grid grid-cols-3 gap-2 pt-4 text-center">
        <div className="p-3 bg-white rounded-xl border border-slate-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <span className="text-xs font-semibold text-slate-700 block">先確認後解題</span>
          <span className="text-[11px] text-slate-400">絕不瞎猜錯誤</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <span className="text-xs font-semibold text-slate-700 block">像家教引導</span>
          <span className="text-[11px] text-slate-400">逐步啟發思考</span>
        </div>
        <div className="p-3 bg-white rounded-xl border border-slate-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
          <span className="text-xs font-semibold text-slate-700 block">國三會考課綱</span>
          <span className="text-[11px] text-slate-400">繁體正統名詞</span>
        </div>
      </div>
    </div>
  );
};
