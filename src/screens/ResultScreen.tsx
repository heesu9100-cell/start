import React, { useMemo } from 'react';
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
import { ExamType, Question } from '../types';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[] };
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
  const { examType, answers, questionIds } = route.params;
  const examInfo = examInfoList.find((e) => e.id === examType);

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

  const getScoreColor = () => {
    if (percentage >= 80) return '#48BB78';
    if (percentage >= 60) return '#ECC94B';
    return '#FC8181';
  };

  const getScoreMessage = () => {
    if (percentage >= 80) return '훌륭합니다!';
    if (percentage >= 60) return '좋은 성적이에요!';
    if (percentage >= 40) return '조금 더 노력해보세요!';
    return '복습이 필요해요!';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Score Card */}
        <View style={styles.scoreCard}>
          <Text style={styles.examName}>{examInfo?.name}</Text>
          <View style={styles.scoreCircle}>
            <Text style={[styles.scorePercentage, { color: getScoreColor() }]}>
              {percentage}%
            </Text>
            <Text style={styles.scoreDetail}>
              {correctCount} / {totalCount}
            </Text>
          </View>
          <Text style={styles.scoreMessage}>{getScoreMessage()}</Text>
        </View>

        {/* Results List */}
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>문제별 결과 및 해설</Text>

          {results.map((result, index) => (
            <View key={result.question.id} style={styles.resultItem}>
              <View style={styles.resultHeader}>
                <View style={styles.resultHeaderLeft}>
                  <View style={[
                    styles.resultBadge,
                    result.isCorrect ? styles.correctBadge : styles.wrongBadge
                  ]}>
                    <Text style={styles.resultBadgeText}>
                      {result.isCorrect ? '정답' : '오답'}
                    </Text>
                  </View>
                  <Text style={styles.questionNumber}>Q{index + 1}</Text>
                </View>
                <View style={styles.answerInfo}>
                  <Text style={styles.answerLabel}>
                    내 답: <Text style={result.isCorrect ? styles.correctText : styles.wrongText}>
                      {result.userAnswer === null ? '-' : result.userAnswer ? 'O' : 'X'}
                    </Text>
                  </Text>
                  <Text style={styles.answerLabel}>
                    정답: <Text style={styles.correctText}>
                      {result.question.answer ? 'O' : 'X'}
                    </Text>
                  </Text>
                </View>
              </View>

              <Text style={styles.questionContent}>{result.question.content}</Text>

              {/* Explanation */}
              <View style={styles.explanationBox}>
                <Text style={styles.explanationTitle}>해설</Text>

                {result.question.explanation.articleRef && (
                  <View style={styles.refBox}>
                    <Text style={styles.refLabel}>📜 조문</Text>
                    <Text style={styles.refText}>{result.question.explanation.articleRef}</Text>
                  </View>
                )}

                {result.question.explanation.precedentRef && (
                  <View style={styles.refBox}>
                    <Text style={styles.refLabel}>⚖️ 판례</Text>
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
          >
            <Text style={styles.retryButtonText}>다시 풀기</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.homeButtonText}>홈으로</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
  },
  scoreCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 24,
  },
  examName: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 20,
  },
  scoreCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#F7FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 6,
    borderColor: '#E2E8F0',
  },
  scorePercentage: {
    fontSize: 42,
    fontWeight: 'bold',
  },
  scoreDetail: {
    fontSize: 16,
    color: '#718096',
    marginTop: 4,
  },
  scoreMessage: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A365D',
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 16,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
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
    backgroundColor: '#C6F6D5',
  },
  wrongBadge: {
    backgroundColor: '#FED7D7',
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A365D',
  },
  questionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
  },
  answerInfo: {
    flexDirection: 'row',
    gap: 12,
  },
  answerLabel: {
    fontSize: 14,
    color: '#4A5568',
  },
  correctText: {
    color: '#2F855A',
    fontWeight: '600',
  },
  wrongText: {
    color: '#C53030',
    fontWeight: '600',
  },
  questionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3748',
    marginBottom: 16,
  },
  explanationBox: {
    backgroundColor: '#F7FAFC',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4299E1',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
    marginBottom: 12,
  },
  refBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  refLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#718096',
    marginBottom: 4,
  },
  refText: {
    fontSize: 14,
    color: '#2D3748',
    fontWeight: '500',
  },
  explanationDetail: {
    fontSize: 14,
    lineHeight: 22,
    color: '#4A5568',
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  retryButton: {
    flex: 1,
    backgroundColor: '#4299E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  homeButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A5568',
  },
});
