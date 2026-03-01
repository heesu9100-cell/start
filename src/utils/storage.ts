import AsyncStorage from '@react-native-async-storage/async-storage';
import { ExamType, StudyRecord, StudyStats, QuestionCategory } from '../types';

const STORAGE_KEYS = {
  STUDY_RECORDS: '@lawplay_study_records',
  STUDY_STATS: '@lawplay_study_stats',
  BOOKMARKS: '@lawplay_bookmarks',
} as const;

// 학습 기록 저장
export const saveStudyRecord = async (record: StudyRecord): Promise<void> => {
  const records = await getStudyRecords();
  records.push(record);
  await AsyncStorage.setItem(STORAGE_KEYS.STUDY_RECORDS, JSON.stringify(records));
  await updateStats(records);
};

// 학습 기록 불러오기
export const getStudyRecords = async (): Promise<StudyRecord[]> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_RECORDS);
  return data ? JSON.parse(data) : [];
};

// 최근 학습 기록 가져오기
export const getRecentRecords = async (limit: number = 10): Promise<StudyRecord[]> => {
  const records = await getStudyRecords();
  return records
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
    .slice(0, limit);
};

// 통계 업데이트
const updateStats = async (records: StudyRecord[]): Promise<void> => {
  if (records.length === 0) return;

  const byExamType: StudyStats['byExamType'] = {
    grade5: { sessions: 0, totalQuestions: 0, totalCorrect: 0, averagePercentage: 0 },
    legislative: { sessions: 0, totalQuestions: 0, totalCorrect: 0, averagePercentage: 0 },
    bar: { sessions: 0, totalQuestions: 0, totalCorrect: 0, averagePercentage: 0 },
  };

  const byCategory: StudyStats['byCategory'] = {};

  let totalQuestions = 0;
  let totalCorrect = 0;
  let bestPercentage = 0;

  records.forEach((record) => {
    totalQuestions += record.totalQuestions;
    totalCorrect += record.correctAnswers;
    if (record.percentage > bestPercentage) bestPercentage = record.percentage;

    const examStats = byExamType[record.examType];
    examStats.sessions += 1;
    examStats.totalQuestions += record.totalQuestions;
    examStats.totalCorrect += record.correctAnswers;
  });

  // 시험 유형별 평균 계산
  (['grade5', 'legislative', 'bar'] as ExamType[]).forEach((type) => {
    const s = byExamType[type];
    s.averagePercentage = s.totalQuestions > 0
      ? Math.round((s.totalCorrect / s.totalQuestions) * 100)
      : 0;
  });

  // 연속 학습일 계산
  const studyDates = [...new Set(
    records.map((r) => r.completedAt.split('T')[0])
  )].sort().reverse();

  let streakDays = 0;
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (studyDates[0] === today || studyDates[0] === yesterday) {
    streakDays = 1;
    for (let i = 1; i < studyDates.length; i++) {
      const prev = new Date(studyDates[i - 1]);
      const curr = new Date(studyDates[i]);
      const diff = (prev.getTime() - curr.getTime()) / 86400000;
      if (diff <= 1) {
        streakDays++;
      } else {
        break;
      }
    }
  }

  const stats: StudyStats = {
    totalSessions: records.length,
    totalQuestions,
    totalCorrect,
    averagePercentage: totalQuestions > 0
      ? Math.round((totalCorrect / totalQuestions) * 100)
      : 0,
    bestPercentage,
    streakDays,
    lastStudyDate: records[records.length - 1].completedAt,
    byExamType,
    byCategory,
  };

  await AsyncStorage.setItem(STORAGE_KEYS.STUDY_STATS, JSON.stringify(stats));
};

// 통계 불러오기
export const getStudyStats = async (): Promise<StudyStats | null> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.STUDY_STATS);
  return data ? JSON.parse(data) : null;
};

// 북마크 토글
export const toggleBookmark = async (questionId: string): Promise<boolean> => {
  const bookmarks = await getBookmarks();
  const index = bookmarks.indexOf(questionId);
  if (index >= 0) {
    bookmarks.splice(index, 1);
  } else {
    bookmarks.push(questionId);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(bookmarks));
  return index < 0; // true if added, false if removed
};

// 북마크 목록 가져오기
export const getBookmarks = async (): Promise<string[]> => {
  const data = await AsyncStorage.getItem(STORAGE_KEYS.BOOKMARKS);
  return data ? JSON.parse(data) : [];
};

// 데이터 초기화
export const clearAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
};

// 고유 ID 생성
export const generateRecordId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
