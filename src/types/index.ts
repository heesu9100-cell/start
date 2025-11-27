// 시험 유형
export type ExamType = 'grade5' | 'legislative' | 'bar';

export interface ExamInfo {
  id: ExamType;
  name: string;
  description: string;
  icon: string;
}

// 문제 타입
export interface Question {
  id: string;
  examType: ExamType;
  year?: number;
  questionNumber?: number;
  content: string;
  answer: boolean; // true = O, false = X
  explanation: {
    type: 'article' | 'precedent' | 'both';
    articleRef?: string; // 헌법 조문 참조
    precedentRef?: string; // 판례 참조
    detail: string;
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
}
