import { useState } from 'react';
import { AppState, RecognitionResult, ConfirmedProblem, ImageQualityReport } from './types';
import { Header } from './components/Header';
import { ImageUploadScreen } from './components/ImageUploadScreen';
import { ImagePreviewScreen, AnalysisLoadingStage } from './components/ImagePreviewScreen';
import { ProblemVerificationScreen } from './components/ProblemVerificationScreen';
import { ModeSelectionScreen } from './components/ModeSelectionScreen';
import { GuidedTutorScreen } from './components/GuidedTutorScreen';
import { FullSolutionScreen } from './components/FullSolutionScreen';
import { UnderstandingCheckScreen } from './components/UnderstandingCheckScreen';
import { SampleQuestion } from './data/sampleQuestions';
import { AlertCircle } from 'lucide-react';

export default function App() {
  const [currentState, setCurrentState] = useState<AppState>('IMAGE_UPLOAD');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedMimeType, setSelectedMimeType] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStage, setAnalysisStage] = useState<AnalysisLoadingStage>('idle');
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null);
  const [multipleQuestionsDetected, setMultipleQuestionsDetected] = useState<boolean>(false);
  const [recognitionResult, setRecognitionResult] = useState<RecognitionResult | null>(null);
  const [confirmedProblem, setConfirmedProblem] = useState<ConfirmedProblem | null>(null);
  const [confirmedQuestion, setConfirmedQuestion] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // When student selects an image or sample
  const handleImageSelected = (base64: string, mimeType: string, sampleData?: SampleQuestion) => {
    setSelectedImage(base64);
    setSelectedMimeType(mimeType);
    setMultipleQuestionsDetected(false);
    setQualityReport(null);
    setErrorMessage(null);
    setAnalysisStage('idle');

    // If it's a known sample question with preset data
    if (sampleData) {
      // Check if sample question contains preset verification info
      const hasDisagreement = sampleData.mockDisagreements && sampleData.mockDisagreements.length > 0;
      const isSampleGeometry = sampleData.category === '幾何' || sampleData.category === '圓形幾何';

      const sampleResult: RecognitionResult = {
        state: hasDisagreement ? 'NEED_CLARIFICATION' : 'IMAGE_REVIEW',
        verification_status: hasDisagreement ? 'needs_confirmation' : 'verified',
        quality: {
          image_quality: 'good',
          issues: [],
          can_continue: true,
          multiple_questions_detected: false,
        },
        question_text: sampleData.question_text,
        candidate_question_text: sampleData.question_text,
        math_expressions: [sampleData.svgPreview],
        critical_values: [],
        confidence: hasDisagreement ? 'medium' : 'high',
        is_geometry: isSampleGeometry,
        diagram_information: sampleData.mockDiagramInfo,
        disagreements: sampleData.mockDisagreements || [],
        verified_elements: [sampleData.svgPreview],
        uncertain_parts: hasDisagreement
          ? sampleData.mockDisagreements!.map(
              (d) => `${d.location}：可能是「${d.pass_1}」或「${d.possible_value}」`
            )
          : [],
        multiple_questions_detected: false,
        topic_hint: sampleData.category,
      };

      setRecognitionResult(sampleResult);
      setCurrentState('IMAGE_REVIEW');
      return;
    }

    // Otherwise show image preview for confirmation
    setCurrentState('IMAGE_UPLOAD');
    setSelectedImage(base64);
  };

  // Dual-pass verification pipeline execution
  const handleStartAnalysis = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    setAnalysisStage('reading');
    setErrorMessage(null);
    setQualityReport(null);
    setMultipleQuestionsDetected(false);

    try {
      // PASS 1: Quality Check + Problem Extraction
      const p1Res = await fetch('/api/analyze-image/pass1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: selectedMimeType,
        }),
      });

      if (!p1Res.ok) {
        throw new Error('第一階段辨識服務回應異常');
      }

      const p1Data = await p1Res.json();
      const quality: ImageQualityReport = p1Data.quality;

      // Check for poor quality or multiple questions
      if (!quality.can_continue || quality.image_quality === 'poor') {
        setQualityReport(quality);
        setMultipleQuestionsDetected(!!quality.multiple_questions_detected);
        setIsAnalyzing(false);
        setAnalysisStage('idle');
        return;
      }

      if (quality.multiple_questions_detected) {
        setMultipleQuestionsDetected(true);
        setIsAnalyzing(false);
        setAnalysisStage('idle');
        return;
      }

      // PASS 2: Independent Mathematical Verification
      setAnalysisStage('checking_math');

      const p2Res = await fetch('/api/analyze-image/pass2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: selectedMimeType,
          pass1: p1Data.pass1,
        }),
      });

      if (!p2Res.ok) {
        throw new Error('第二階段符號核對服務回應異常');
      }

      const verifiedData: RecognitionResult = await p2Res.json();
      setRecognitionResult(verifiedData);
      setCurrentState(verifiedData.state === 'NEED_CLARIFICATION' ? 'NEED_CLARIFICATION' : 'IMAGE_REVIEW');
    } catch (err: any) {
      console.error('Recognition error:', err);
      // Fallback: try backward-compatible full endpoint
      try {
        const fallbackRes = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: selectedImage,
            mimeType: selectedMimeType,
          }),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          if (fallbackData.multiple_questions_detected) {
            setMultipleQuestionsDetected(true);
          } else if (fallbackData.quality && !fallbackData.quality.can_continue) {
            setQualityReport(fallbackData.quality);
          } else {
            setRecognitionResult(fallbackData);
            setCurrentState(fallbackData.state === 'NEED_CLARIFICATION' ? 'NEED_CLARIFICATION' : 'IMAGE_REVIEW');
            return;
          }
        }
      } catch (e) {
        // Ignored
      }
      setErrorMessage('讀取題目時遇到問題，請確認相片光線清晰，且數學式完整入鏡後重試。');
    } finally {
      setIsAnalyzing(false);
      setAnalysisStage('idle');
    }
  };

  // Student confirms the recognized and edited question text -> Locks confirmed problem!
  const handleConfirmProblem = (authoritativeText: string, confirmedObj?: ConfirmedProblem) => {
    const lockedProblem: ConfirmedProblem = confirmedObj || {
      status: 'CONFIRMED',
      confirmed_question: authoritativeText,
      confirmed_by_student: true,
      is_geometry: recognitionResult?.is_geometry,
      diagram_information: recognitionResult?.diagram_information,
    };

    setConfirmedProblem(lockedProblem);
    setConfirmedQuestion(authoritativeText);
    setCurrentState('MODE_SELECTION');
  };

  // Student chooses learning mode
  const handleSelectMode = (mode: 'TUTOR_MODE' | 'FULL_SOLUTION') => {
    setCurrentState(mode);
  };

  // Tutor or Solution complete -> Understanding Check
  const handleCompletedSolution = () => {
    setCurrentState('UNDERSTANDING_CHECK');
  };

  // Reset / Next Problem flow
  const handleResetToHome = () => {
    setSelectedImage(null);
    setRecognitionResult(null);
    setConfirmedProblem(null);
    setConfirmedQuestion('');
    setMultipleQuestionsDetected(false);
    setQualityReport(null);
    setErrorMessage(null);
    setAnalysisStage('idle');
    setCurrentState('IMAGE_UPLOAD');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-indigo-100 selection:text-indigo-900">
      {/* Top Navigation / App Header */}
      <Header currentState={currentState} onReset={handleResetToHome} />

      {/* Global Error Banner if any */}
      {errorMessage && (
        <div className="max-w-xl mx-auto px-4 pt-4 w-full">
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-semibold">{errorMessage}</p>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2 py-1 rounded bg-rose-100"
            >
              關閉
            </button>
          </div>
        </div>
      )}

      {/* Main Screen Views according to Explicit State */}
      <main className="flex-1 pb-16">
        {/* Screen 1: Image Upload (Home) */}
        {currentState === 'IMAGE_UPLOAD' && !selectedImage && (
          <ImageUploadScreen onImageSelected={handleImageSelected} />
        )}

        {/* Screen 1.5: Image Preview & Confirmation */}
        {currentState === 'IMAGE_UPLOAD' && selectedImage && (
          <ImagePreviewScreen
            imageSrc={selectedImage}
            isAnalyzing={isAnalyzing}
            analysisStage={analysisStage}
            qualityReport={qualityReport}
            multipleQuestionsDetected={multipleQuestionsDetected}
            onConfirmAnalyze={handleStartAnalysis}
            onRetake={handleResetToHome}
            onReselect={handleResetToHome}
          />
        )}

        {/* Screen 2: Problem Verification & Edit */}
        {(currentState === 'IMAGE_REVIEW' || currentState === 'NEED_CLARIFICATION') &&
          recognitionResult && (
            <ProblemVerificationScreen
              imageSrc={selectedImage || ''}
              recognition={recognitionResult}
              onConfirmProblem={handleConfirmProblem}
              onRetake={handleResetToHome}
            />
          )}

        {/* Screen 3: Learning Mode Selection */}
        {currentState === 'MODE_SELECTION' && (
          <ModeSelectionScreen
            confirmedQuestion={confirmedQuestion}
            onSelectMode={handleSelectMode}
          />
        )}

        {/* Mode A: Guided Tutor */}
        {currentState === 'TUTOR_MODE' && (
          <GuidedTutorScreen
            questionText={confirmedQuestion}
            imageSrc={selectedImage || undefined}
            onCompleted={handleCompletedSolution}
          />
        )}

        {/* Mode B: Full Solution */}
        {currentState === 'FULL_SOLUTION' && (
          <FullSolutionScreen
            questionText={confirmedQuestion}
            imageSrc={selectedImage || undefined}
            onCompleted={handleCompletedSolution}
          />
        )}

        {/* Understanding Check: 我懂了 / 有一步不懂 / 出一題讓我試試 */}
        {currentState === 'UNDERSTANDING_CHECK' && (
          <UnderstandingCheckScreen
            questionText={confirmedQuestion}
            onNextProblem={handleResetToHome}
          />
        )}
      </main>
    </div>
  );
}
