import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { getQuestionsByExamType, shuffleQuestions, examInfoList } from '../data/questions';
import { ExamType, Question, difficultyNames, categoryNames } from '../types';
import { toggleBookmark, getBookmarks } from '../utils/storage';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[]; startTime: number };
};

type QuizScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
  route: RouteProp<RootStackParamList, 'Quiz'>;
};

export default function QuizScreen({ navigation, route }: QuizScreenProps) {
  const { examType } = route.params;
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [startTime] = useState(Date.now());
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const examInfo = examInfoList.find((e) => e.id === examType);

  useEffect(() => {
    const examQuestions = getQuestionsByExamType(examType);
    const shuffled = shuffleQuestions(examQuestions);
    setQuestions(shuffled);
    setAnswers(new Array(shuffled.length).fill(null));
    loadBookmarks();
  }, [examType]);

  const loadBookmarks = async () => {
    const bm = await getBookmarks();
    setBookmarkedIds(bm);
  };

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = (answer: boolean) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);

    // Animate feedback
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      fadeAnim.setValue(0);
    } else {
      navigation.replace('Result', {
        examType,
        answers,
        questionIds: questions.map((q) => q.id),
        startTime,
      });
    }
  };

  const handleQuit = () => {
    Alert.alert(
      '퀴즈 종료',
      '정말 종료하시겠습니까?\n진행 상황이 저장되지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  const handleBookmark = async () => {
    if (!currentQuestion) return;
    const added = await toggleBookmark(currentQuestion.id);
    if (added) {
      setBookmarkedIds([...bookmarkedIds, currentQuestion.id]);
    } else {
      setBookmarkedIds(bookmarkedIds.filter((id) => id !== currentQuestion.id));
    }
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>문제를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCorrect = selectedAnswer === currentQuestion.answer;
  const isBookmarked = bookmarkedIds.includes(currentQuestion.id);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit} style={styles.headerButton}>
          <Text style={styles.quitButton}>✕</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{examInfo?.name}</Text>
          <Text style={styles.questionCount}>
            {currentIndex + 1} / {questions.length}
          </Text>
        </View>
        <TouchableOpacity onPress={handleBookmark} style={styles.headerButton}>
          <Text style={styles.bookmarkButton}>{isBookmarked ? '★' : '☆'}</Text>
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Card */}
        <View style={styles.questionCard}>
          <View style={styles.questionMeta}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaBadgeText}>
                {categoryNames[currentQuestion.category]}
              </Text>
            </View>
            <View style={[
              styles.metaBadge,
              currentQuestion.difficulty === 'easy' && styles.metaBadgeEasy,
              currentQuestion.difficulty === 'medium' && styles.metaBadgeMedium,
              currentQuestion.difficulty === 'hard' && styles.metaBadgeHard,
            ]}>
              <Text style={[
                styles.metaBadgeText,
                currentQuestion.difficulty === 'easy' && styles.metaBadgeEasyText,
                currentQuestion.difficulty === 'medium' && styles.metaBadgeMediumText,
                currentQuestion.difficulty === 'hard' && styles.metaBadgeHardText,
              ]}>
                {difficultyNames[currentQuestion.difficulty]}
              </Text>
            </View>
            {currentQuestion.year && (
              <View style={styles.metaBadge}>
                <Text style={styles.metaBadgeText}>{currentQuestion.year}년</Text>
              </View>
            )}
          </View>

          <Text style={styles.questionLabel}>Q{currentIndex + 1}</Text>
          <Text style={styles.questionText}>{currentQuestion.content}</Text>

          {currentQuestion.keywords.length > 0 && (
            <View style={styles.keywords}>
              {currentQuestion.keywords.map((kw, i) => (
                <View key={i} style={styles.keywordBadge}>
                  <Text style={styles.keywordText}>#{kw}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Answer Buttons */}
        <View style={styles.answerContainer}>
          <TouchableOpacity
            style={[
              styles.answerButton,
              styles.oButton,
              showFeedback && selectedAnswer === true && (isCorrect ? styles.correctButton : styles.wrongButton),
              showFeedback && currentQuestion.answer === true && selectedAnswer !== true && styles.correctHint,
            ]}
            onPress={() => handleAnswer(true)}
            disabled={showFeedback}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.answerText,
              styles.oText,
              showFeedback && selectedAnswer === true && styles.selectedAnswerText,
            ]}>
              O
            </Text>
            <Text style={[
              styles.answerSubtext,
              styles.oSubtext,
              showFeedback && selectedAnswer === true && styles.selectedAnswerSubtext,
            ]}>
              맞다
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.answerButton,
              styles.xButton,
              showFeedback && selectedAnswer === false && (isCorrect ? styles.correctButton : styles.wrongButton),
              showFeedback && currentQuestion.answer === false && selectedAnswer !== false && styles.correctHint,
            ]}
            onPress={() => handleAnswer(false)}
            disabled={showFeedback}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.answerText,
              styles.xText,
              showFeedback && selectedAnswer === false && styles.selectedAnswerText,
            ]}>
              X
            </Text>
            <Text style={[
              styles.answerSubtext,
              styles.xSubtext,
              showFeedback && selectedAnswer === false && styles.selectedAnswerSubtext,
            ]}>
              틀리다
            </Text>
          </TouchableOpacity>
        </View>

        {/* Feedback & Explanation */}
        {showFeedback && (
          <Animated.View
            style={[
              styles.feedbackWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Result Badge */}
            <View style={[styles.feedbackBanner, isCorrect ? styles.correctBanner : styles.wrongBanner]}>
              <Text style={styles.feedbackEmoji}>{isCorrect ? '🎉' : '😥'}</Text>
              <View>
                <Text style={styles.feedbackBannerText}>
                  {isCorrect ? '정답입니다!' : '오답입니다'}
                </Text>
                <Text style={styles.feedbackBannerSub}>
                  정답: {currentQuestion.answer ? 'O (맞다)' : 'X (틀리다)'}
                </Text>
              </View>
            </View>

            {/* Explanation Card */}
            <View style={styles.explanationCard}>
              <View style={styles.explanationHeader}>
                <Text style={styles.explanationIcon}>📚</Text>
                <Text style={styles.explanationTitle}>해설</Text>
              </View>

              {/* Key Point */}
              <View style={styles.keyPointBox}>
                <Text style={styles.keyPointLabel}>핵심 포인트</Text>
                <Text style={styles.keyPointText}>{currentQuestion.explanation.keyPoint}</Text>
              </View>

              {/* References */}
              {currentQuestion.explanation.articleRef && (
                <View style={styles.refBox}>
                  <Text style={styles.refIcon}>📜</Text>
                  <View style={styles.refContent}>
                    <Text style={styles.refLabel}>조문</Text>
                    <Text style={styles.refText}>{currentQuestion.explanation.articleRef}</Text>
                  </View>
                </View>
              )}

              {currentQuestion.explanation.precedentRef && (
                <View style={styles.refBox}>
                  <Text style={styles.refIcon}>⚖️</Text>
                  <View style={styles.refContent}>
                    <Text style={styles.refLabel}>판례</Text>
                    <Text style={styles.refText}>{currentQuestion.explanation.precedentRef}</Text>
                  </View>
                </View>
              )}

              {/* Detail */}
              <Text style={styles.explanationDetail}>
                {currentQuestion.explanation.detail}
              </Text>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Next Button - Fixed at bottom */}
      {showFeedback && (
        <View style={styles.nextButtonContainer}>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextButtonText}>
              {currentIndex < questions.length - 1 ? '다음 문제 →' : '결과 보기 →'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#94A3B8',
  },
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quitButton: {
    fontSize: 18,
    color: '#94A3B8',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  questionCount: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  bookmarkButton: {
    fontSize: 22,
    color: '#FBBF24',
  },
  // Progress
  progressContainer: {
    height: 3,
    backgroundColor: '#1E293B',
    marginHorizontal: 16,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#60A5FA',
    borderRadius: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // Question Card
  questionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  questionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  metaBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  metaBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  metaBadgeEasy: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
  },
  metaBadgeEasyText: {
    color: '#34D399',
  },
  metaBadgeMedium: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
  },
  metaBadgeMediumText: {
    color: '#FBBF24',
  },
  metaBadgeHard: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  metaBadgeHardText: {
    color: '#F87171',
  },
  questionLabel: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '700',
    marginBottom: 10,
  },
  questionText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#F8FAFC',
    fontWeight: '500',
  },
  keywords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 16,
  },
  keywordBadge: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  keywordText: {
    fontSize: 12,
    color: '#60A5FA',
  },
  // Answer Buttons
  answerContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  answerButton: {
    flex: 1,
    height: 110,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  oButton: {
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    borderColor: '#34D399',
  },
  xButton: {
    backgroundColor: 'rgba(248, 113, 113, 0.08)',
    borderColor: '#F87171',
  },
  correctButton: {
    backgroundColor: '#34D399',
    borderColor: '#10B981',
  },
  wrongButton: {
    backgroundColor: '#F87171',
    borderColor: '#EF4444',
  },
  correctHint: {
    borderColor: '#34D399',
    borderWidth: 3,
    borderStyle: 'dashed' as any,
  },
  answerText: {
    fontSize: 44,
    fontWeight: 'bold',
  },
  oText: {
    color: '#34D399',
  },
  xText: {
    color: '#F87171',
  },
  selectedAnswerText: {
    color: '#FFFFFF',
  },
  answerSubtext: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  oSubtext: {
    color: '#34D399',
  },
  xSubtext: {
    color: '#F87171',
  },
  selectedAnswerSubtext: {
    color: 'rgba(255,255,255,0.8)',
  },
  // Feedback
  feedbackWrapper: {
    gap: 16,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  correctBanner: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  wrongBanner: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  feedbackEmoji: {
    fontSize: 32,
  },
  feedbackBannerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  feedbackBannerSub: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },
  // Explanation
  explanationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  explanationIcon: {
    fontSize: 20,
  },
  explanationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  keyPointBox: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#60A5FA',
  },
  keyPointLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#60A5FA',
    marginBottom: 6,
    letterSpacing: 1,
  },
  keyPointText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    lineHeight: 22,
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  refIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  refContent: {
    flex: 1,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 3,
  },
  refText: {
    fontSize: 14,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  explanationDetail: {
    fontSize: 14,
    lineHeight: 22,
    color: '#94A3B8',
    marginTop: 6,
  },
  // Next Button
  nextButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 30,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  nextButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
