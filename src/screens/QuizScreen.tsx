import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { getQuestionsByExamType, shuffleQuestions, examInfoList } from '../data/questions';
import { ExamType, Question } from '../types';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[] };
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

  const examInfo = examInfoList.find((e) => e.id === examType);

  useEffect(() => {
    const examQuestions = getQuestionsByExamType(examType);
    const shuffled = shuffleQuestions(examQuestions);
    setQuestions(shuffled);
    setAnswers(new Array(shuffled.length).fill(null));
  }, [examType]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = (answer: boolean) => {
    if (showFeedback) return;

    setSelectedAnswer(answer);
    setShowFeedback(true);

    const newAnswers = [...answers];
    newAnswers[currentIndex] = answer;
    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      // 마지막 문제 - 결과 화면으로 이동
      navigation.replace('Result', {
        examType,
        answers,
        questionIds: questions.map((q) => q.id),
      });
    }
  };

  const handleQuit = () => {
    Alert.alert(
      '퀴즈 종료',
      '정말 종료하시겠습니까? 진행 상황이 저장되지 않습니다.',
      [
        { text: '취소', style: 'cancel' },
        { text: '종료', style: 'destructive', onPress: () => navigation.goBack() },
      ]
    );
  };

  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>문제를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  const isCorrect = selectedAnswer === currentQuestion.answer;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleQuit}>
          <Text style={styles.quitButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{examInfo?.name}</Text>
        <Text style={styles.questionCount}>
          {currentIndex + 1} / {questions.length}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionLabel}>Q{currentIndex + 1}</Text>
        <Text style={styles.questionText}>{currentQuestion.content}</Text>
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
        >
          <Text style={[
            styles.answerText,
            styles.oText,
            showFeedback && selectedAnswer === true && styles.selectedAnswerText,
          ]}>
            O
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
        >
          <Text style={[
            styles.answerText,
            styles.xText,
            showFeedback && selectedAnswer === false && styles.selectedAnswerText,
          ]}>
            X
          </Text>
        </TouchableOpacity>
      </View>

      {/* Feedback */}
      {showFeedback && (
        <View style={styles.feedbackContainer}>
          <View style={[styles.feedbackBadge, isCorrect ? styles.correctBadge : styles.wrongBadge]}>
            <Text style={styles.feedbackBadgeText}>
              {isCorrect ? '정답입니다!' : '오답입니다'}
            </Text>
          </View>
          <Text style={styles.correctAnswerText}>
            정답: {currentQuestion.answer ? 'O' : 'X'}
          </Text>
        </View>
      )}

      {/* Next Button */}
      {showFeedback && (
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentIndex < questions.length - 1 ? '다음 문제' : '결과 보기'}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
    color: '#718096',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  quitButton: {
    fontSize: 24,
    color: '#718096',
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
  },
  questionCount: {
    fontSize: 16,
    color: '#4A5568',
  },
  progressContainer: {
    height: 4,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4299E1',
    borderRadius: 2,
  },
  questionContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  questionLabel: {
    fontSize: 14,
    color: '#4299E1',
    fontWeight: '600',
    marginBottom: 12,
  },
  questionText: {
    fontSize: 20,
    lineHeight: 32,
    color: '#1A365D',
    fontWeight: '500',
  },
  answerContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 20,
  },
  answerButton: {
    flex: 1,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
  },
  oButton: {
    backgroundColor: '#F0FFF4',
    borderColor: '#48BB78',
  },
  xButton: {
    backgroundColor: '#FFF5F5',
    borderColor: '#FC8181',
  },
  correctButton: {
    backgroundColor: '#48BB78',
    borderColor: '#2F855A',
  },
  wrongButton: {
    backgroundColor: '#FC8181',
    borderColor: '#C53030',
  },
  correctHint: {
    borderColor: '#48BB78',
    borderWidth: 4,
  },
  answerText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  oText: {
    color: '#2F855A',
  },
  xText: {
    color: '#C53030',
  },
  selectedAnswerText: {
    color: '#FFFFFF',
  },
  feedbackContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  feedbackBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  correctBadge: {
    backgroundColor: '#C6F6D5',
  },
  wrongBadge: {
    backgroundColor: '#FED7D7',
  },
  feedbackBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A365D',
  },
  correctAnswerText: {
    fontSize: 14,
    color: '#4A5568',
  },
  nextButton: {
    backgroundColor: '#4299E1',
    marginHorizontal: 20,
    marginBottom: 30,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
