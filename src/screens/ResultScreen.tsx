import React, { useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { questions as allQuestions, examInfoList } from '../data/questions';
import { ExamType, Question, categoryNames, difficultyNames } from '../types';
import { saveStudyRecord, generateRecordId } from '../utils/storage';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[]; startTime: number };
  Stats: undefined;
};

type ResultScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>;
  route: RouteProp<RootStackParamList, 'Result'>;
};

interface QuestionResult {
  question: Question;
  userAnswer: boolean | null;
  isCorrect: boolean;
}

export default function ResultScreen({ navigation, route }: ResultScreenProps) {
  const { examType, answers, questionIds, startTime } = route.params;
  const examInfo = examInfoList.find((e) => e.id === examType);
  const elapsedSeconds = Math.round((Date.now() - startTime) / 1000);

  const results = useMemo<QuestionResult[]>(() => {
    return questionIds.map((id, index) => {
      const question = allQuestions.find((q) => q.id === id)!;
      const userAnswer = answers[index];
      return {
        question,
        userAnswer,
        isCorrect: userAnswer === question.answer,
      };
    });
  }, [questionIds, answers]);

  const correctCount = results.filter((r) => r.isCorrect).length;
  const totalCount = results.length;
  const percentage = Math.round((correctCount / totalCount) * 100);

  // 학습 기록 저장
  useEffect(() => {
    const record = {
      id: generateRecordId(),
      examType,
      totalQuestions: totalCount,
      correctAnswers: correctCount,
      percentage,
      elapsedSeconds,
      completedAt: new Date().toISOString(),
      wrongQuestionIds: results.filter((r) => !r.isCorrect).map((r) => r.question.id),
    };
    saveStudyRecord(record);
  }, []);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}분 ${sec}초`;
  };

  const getScoreColor = () => {
    if (percentage >= 80) return '#34D399';
    if (percentage >= 60) return '#FBBF24';
    return '#F87171';
  };

  const getScoreMessage = () => {
    if (percentage === 100) return '완벽합니다!';
    if (percentage >= 80) return '훌륭합니다!';
    if (percentage >= 60) return '좋은 성적이에요!';
    if (percentage >= 40) return '조금 더 노력해보세요!';
    return '복습이 필요해요!';
  };

  const getScoreEmoji = () => {
    if (percentage === 100) return '🏆';
    if (percentage >= 80) return '🎉';
    if (percentage >= 60) return '👍';
    if (percentage >= 40) return '💪';
    return '📖';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreEmoji}>{getScoreEmoji()}</Text>
          <Text style={styles.scoreMessage}>{getScoreMessage()}</Text>

          <View style={styles.scoreCircle}>
            <Text style={[styles.scorePercentage, { color: getScoreColor() }]}>
              {percentage}
            </Text>
            <Text style={styles.scorePercent}>%</Text>
          </View>

          <View style={styles.scoreDetails}>
            <View style={styles.scoreDetailItem}>
              <Text style={styles.scoreDetailValue}>{correctCount}</Text>
              <Text style={styles.scoreDetailLabel}>정답</Text>
            </View>
            <View style={styles.scoreDetailDivider} />
            <View style={styles.scoreDetailItem}>
              <Text style={[styles.scoreDetailValue, styles.wrongValue]}>
                {totalCount - correctCount}
              </Text>
              <Text style={styles.scoreDetailLabel}>오답</Text>
            </View>
            <View style={styles.scoreDetailDivider} />
            <View style={styles.scoreDetailItem}>
              <Text style={styles.scoreDetailValue}>{formatTime(elapsedSeconds)}</Text>
              <Text style={styles.scoreDetailLabel}>소요시간</Text>
            </View>
          </View>
        </View>

        {/* Results List */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>문제별 결과 및 해설</Text>

          {results.map((result, index) => (
            <View key={result.question.id} style={styles.resultItem}>
              {/* Result Header */}
              <View style={styles.resultHeader}>
                <View style={styles.resultHeaderLeft}>
                  <View style={[
                    styles.resultBadge,
                    result.isCorrect ? styles.correctBadge : styles.wrongBadge
                  ]}>
                    <Text style={[
                      styles.resultBadgeText,
                      result.isCorrect ? styles.correctBadgeText : styles.wrongBadgeText
                    ]}>
                      {result.isCorrect ? '정답' : '오답'}
                    </Text>
                  </View>
                  <Text style={styles.questionNumber}>Q{index + 1}</Text>
                  <View style={[
                    styles.diffBadge,
                    result.question.difficulty === 'easy' && styles.diffEasy,
                    result.question.difficulty === 'medium' && styles.diffMedium,
                    result.question.difficulty === 'hard' && styles.diffHard,
                  ]}>
                    <Text style={styles.diffText}>
                      {difficultyNames[result.question.difficulty]}
                    </Text>
                  </View>
                </View>
                <View style={styles.answerInfo}>
                  <Text style={styles.answerLabel}>
                    {result.userAnswer === null ? '-' : result.userAnswer ? 'O' : 'X'}
                    {' → '}
                    {result.question.answer ? 'O' : 'X'}
                  </Text>
                </View>
              </View>

              {/* Question Content */}
              <Text style={styles.questionContent}>{result.question.content}</Text>

              {/* Key Point */}
              <View style={styles.keyPointBox}>
                <Text style={styles.keyPointLabel}>핵심</Text>
                <Text style={styles.keyPointText}>
                  {result.question.explanation.keyPoint}
                </Text>
              </View>

              {/* Explanation */}
              <View style={styles.explanationBox}>
                {result.question.explanation.articleRef && (
                  <View style={styles.refRow}>
                    <Text style={styles.refIcon}>📜</Text>
                    <Text style={styles.refText}>{result.question.explanation.articleRef}</Text>
                  </View>
                )}

                {result.question.explanation.precedentRef && (
                  <View style={styles.refRow}>
                    <Text style={styles.refIcon}>⚖️</Text>
                    <Text style={styles.refText}>{result.question.explanation.precedentRef}</Text>
                  </View>
                )}

                <Text style={styles.explanationDetail}>
                  {result.question.explanation.detail}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => navigation.replace('Quiz', { examType })}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>🔄 다시 풀기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.popToTop()}
            activeOpacity={0.7}
          >
            <Text style={styles.homeButtonText}>🏠 홈으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Score Card
  scoreCard: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  scoreMessage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 20,
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 24,
  },
  scorePercentage: {
    fontSize: 72,
    fontWeight: 'bold',
  },
  scorePercent: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#64748B',
    marginLeft: 4,
  },
  scoreDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  scoreDetailItem: {
    alignItems: 'center',
    flex: 1,
  },
  scoreDetailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34D399',
    marginBottom: 4,
  },
  wrongValue: {
    color: '#F87171',
  },
  scoreDetailLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  scoreDetailDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#334155',
  },
  // Results
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  resultItem: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  correctBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  wrongBadge: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  correctBadgeText: {
    color: '#34D399',
  },
  wrongBadgeText: {
    color: '#F87171',
  },
  questionNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: '#60A5FA',
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  diffEasy: {
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
  },
  diffMedium: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
  },
  diffHard: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
  },
  diffText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
  },
  answerInfo: {
    flexDirection: 'row',
    gap: 8,
  },
  answerLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  questionContent: {
    fontSize: 15,
    lineHeight: 23,
    color: '#CBD5E1',
    marginBottom: 12,
  },
  keyPointBox: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#60A5FA',
  },
  keyPointLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 1,
    marginBottom: 4,
  },
  keyPointText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    lineHeight: 20,
  },
  explanationBox: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 14,
  },
  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  refIcon: {
    fontSize: 14,
  },
  refText: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
    flex: 1,
  },
  explanationDetail: {
    fontSize: 13,
    lineHeight: 20,
    color: '#94A3B8',
    marginTop: 4,
  },
  // Actions
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CBD5E1',
  },
});
