// 시험 유형
export type ExamType = 'grade5' | 'legislative' | 'bar';

// 난이도
export type Difficulty = 'easy' | 'medium' | 'hard';

// 문제 카테고리 (헌법 분야별)
export type QuestionCategory =
  | 'general' // 헌법 총론
  | 'basic_rights' // 기본권
  | 'government' // 통치구조
  | 'court' // 사법부
  | 'constitutional_court' // 헌법재판소
  | 'president' // 대통령
  | 'national_assembly' // 국회
  | 'election' // 선거
  | 'local_government' // 지방자치
  | 'economy'; // 경제

export const categoryNames: Record<QuestionCategory, string> = {
  general: '헌법 총론',
  basic_rights: '기본권',
  government: '통치구조',
  court: '사법부',
  constitutional_court: '헌법재판소',
  president: '대통령',
  national_assembly: '국회',
  election: '선거',
  local_government: '지방자치',
  economy: '경제',
};

export const difficultyNames: Record<Difficulty, string> = {
  easy: '기본',
  medium: '중급',
  hard: '고급',
};

export interface ExamInfo {
  id: ExamType;
  name: string;
  description: string;
  icon: string;
  questionCount?: number;
}

// 문제 타입
export interface Question {
  id: string;
  examType: ExamType;
  year?: number;
  questionNumber?: number;
  content: string;
  answer: boolean; // true = O, false = X
  difficulty: Difficulty;
  category: QuestionCategory;
  keywords: string[];
  explanation: {
    type: 'article' | 'precedent' | 'both';
    articleRef?: string;
    precedentRef?: string;
    detail: string;
    keyPoint: string; // 핵심 포인트 한줄 요약
  };
}

// 퀴즈 세션
export interface QuizSession {
  examType: ExamType;
  questions: Question[];
  currentIndex: number;
  answers: (boolean | null)[];
  startTime: Date;
}

// 퀴즈 결과
export interface QuizResult {
  examType: ExamType;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  answers: {
    question: Question;
    userAnswer: boolean | null;
    isCorrect: boolean;
  }[];
  completedAt: Date;
  elapsedSeconds: number;
}

// 저장되는 학습 기록
export interface StudyRecord {
  id: string;
  examType: ExamType;
  totalQuestions: number;
  correctAnswers: number;
  percentage: number;
  elapsedSeconds: number;
  completedAt: string; // ISO string
  wrongQuestionIds: string[];
}

// 통계 데이터
export interface StudyStats {
  totalSessions: number;
  totalQuestions: number;
  totalCorrect: number;
  averagePercentage: number;
  bestPercentage: number;
  streakDays: number;
  lastStudyDate: string;
  byExamType: Record<ExamType, {
    sessions: number;
    totalQuestions: number;
    totalCorrect: number;
    averagePercentage: number;
  }>;
  byCategory: Record<string, {
    totalQuestions: number;
    totalCorrect: number;
    percentage: number;
  }>;
}
