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

// 리모컨 역할
export type RemoteRole = 'host' | 'controller';

// 리모컨 연결 상태
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// 디스플레이 퀴즈 상태
export type DisplayQuizPhase = 'waiting' | 'exam_select' | 'question' | 'answer_revealed' | 'result';

// 디스플레이 퀴즈 상태 데이터
export interface DisplayQuizState {
  phase: DisplayQuizPhase;
  examType: ExamType | null;
  questions: Question[];
  currentIndex: number;
  answers: (boolean | null)[];
  selectedAnswer: boolean | null;
  showFeedback: boolean;
}

// WebSocket 메시지 타입
export type RemoteMessageType =
  | 'CREATE_ROOM'
  | 'JOIN_ROOM'
  | 'ROOM_CREATED'
  | 'ROOM_JOINED'
  | 'PEER_JOINED'
  | 'PEER_LEFT'
  | 'COMMAND'
  | 'STATE_UPDATE'
  | 'ERROR';

// 리모컨 명령어
export type RemoteCommand =
  | 'SELECT_EXAM'
  | 'START_QUIZ'
  | 'ANSWER_O'
  | 'ANSWER_X'
  | 'NEXT_QUESTION'
  | 'RESTART'
  | 'END_QUIZ';

// WebSocket 메시지
export interface RemoteMessage {
  type: RemoteMessageType;
  roomCode?: string;
  command?: RemoteCommand;
  payload?: any;
}
