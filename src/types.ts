export type AppState =
  | 'IMAGE_UPLOAD'
  | 'IMAGE_REVIEW'
  | 'NEED_CLARIFICATION'
  | 'MODE_SELECTION'
  | 'TUTOR_MODE'
  | 'FULL_SOLUTION'
  | 'UNDERSTANDING_CHECK'
  | 'PRACTICE';

export type ImageQuality = 'good' | 'acceptable' | 'poor';

export interface ImageQualityReport {
  image_quality: ImageQuality;
  issues: string[];
  can_continue: boolean;
  multiple_questions_detected?: boolean;
}

export interface DiagramAngle {
  name: string;
  value: string;
}

export interface DiagramLength {
  segment: string;
  value: string;
}

export interface DiagramInfo {
  points?: string[];
  angles?: DiagramAngle[];
  lengths?: DiagramLength[];
  relations?: string[];
}

export interface DisagreementItem {
  location: string;
  pass_1: string;
  possible_value: string;
  reason: string;
  suggested_options: string[];
  resolved_value?: string;
}

export interface DiagramDisagreementItem {
  element: string;
  pass_1_value: string;
  verified_value: string;
  reason: string;
  suggested_options: string[];
}

export interface Pass1Result {
  question_text: string;
  math_expressions: string[];
  critical_values: string[];
  is_geometry: boolean;
  diagram_information?: DiagramInfo;
  topic_hint?: string;
  uncertain_parts: string[];
}

export interface DualVerificationResult {
  verification_status: 'verified' | 'needs_confirmation' | 'unreadable';
  quality: ImageQualityReport;
  question_text: string;
  candidate_question_text: string;
  math_expressions: string[];
  critical_values: string[];
  is_geometry: boolean;
  diagram_information?: DiagramInfo;
  disagreements: DisagreementItem[];
  diagram_disagreements?: DiagramDisagreementItem[];
  verified_elements: string[];
  uncertain_parts: string[];
  unreadable_reason?: string;
  topic_hint?: string;
}

// Backward-compatible RecognitionResult alias for components
export interface RecognitionResult extends DualVerificationResult {
  state: 'IMAGE_REVIEW' | 'NEED_CLARIFICATION';
  confidence: 'high' | 'medium' | 'low';
  multiple_questions_detected: boolean;
  geometry_details?: string;
}

export interface ConfirmedProblem {
  status: 'CONFIRMED';
  confirmed_question: string;
  confirmed_by_student: boolean;
  diagram_information?: DiagramInfo;
  is_geometry?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'teacher' | 'student' | 'system';
  content: string;
  mathFormula?: string;
  hintLevel?: number;
  isCorrect?: boolean;
  timestamp: number;
}

export interface TutorStepResponse {
  teacher_message: string;
  current_step: number;
  attempt: number;
  hint_level: number;
  student_answer_correct?: boolean;
  waiting_for_student: boolean;
  is_complete: boolean;
  concept_introduction?: string;
  direct_answer_revealed?: boolean;
  encouragement?: string;
}

export interface SolutionStep {
  step_number: number;
  title: string;
  math: string;
  explanation: string;
}

export interface FullSolutionData {
  topic: string; // 這題在考什麼？
  thinking: string; // 解題思路
  steps: SolutionStep[];
  final_answer: string; // 答案
  verification: string; // 檢查
  takeaways: string[]; // 這題你要記住
  is_above_grade9: boolean;
  above_grade9_note?: string;
}

export interface PracticeProblemData {
  problem_text: string;
  concept: string;
  hint: string;
  reference_answer: string;
}

export interface PracticeCheckResponse {
  is_correct: boolean;
  teacher_message: string;
  hint_level: number;
  explained_answer?: string;
}
