import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  ExamType,
  Question,
  RemoteMessage,
  DisplayQuizState,
} from '../types';
import { getQuestionsByExamType, shuffleQuestions, examInfoList } from '../data/questions';
import { remoteControl } from '../utils/remoteControl';

type RootStackParamList = {
  Home: undefined;
  RemoteControl: undefined;
  Display: { roomCode: string };
  Controller: { roomCode: string };
};

type DisplayScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Display'>;
  route: RouteProp<RootStackParamList, 'Display'>;
};

export default function DisplayScreen({ navigation, route }: DisplayScreenProps) {
  const { roomCode } = route.params;
  const [controllerConnected, setControllerConnected] = useState(false);
  const [quizState, setQuizState] = useState<DisplayQuizState>({
    phase: 'waiting',
    examType: null,
    questions: [],
    currentIndex: 0,
    answers: [],
    selectedAnswer: null,
    showFeedback: false,
  });

  const broadcastState = useCallback((state: DisplayQuizState) => {
    remoteControl.sendStateUpdate({
      phase: state.phase,
      examType: state.examType,
      currentIndex: state.currentIndex,
      totalQuestions: state.questions.length,
      currentQuestion: state.questions[state.currentIndex] || null,
      selectedAnswer: state.selectedAnswer,
      showFeedback: state.showFeedback,
      answers: state.answers,
      questions: state.questions,
    });
  }, []);

  const handleCommand = useCallback((message: RemoteMessage) => {
    if (message.type === 'PEER_JOINED') {
      setControllerConnected(true);
      setQuizState((prev) => {
        broadcastState(prev);
        return prev;
      });
      return;
    }

    if (message.type === 'PEER_LEFT') {
      setControllerConnected(false);
      return;
    }

    if (message.type !== 'COMMAND') return;

    setQuizState((prev) => {
      let next = { ...prev };

      switch (message.command) {
        case 'SELECT_EXAM': {
          const examType = message.payload?.examType as ExamType;
          if (examType) {
            const questions = shuffleQuestions(getQuestionsByExamType(examType));
            next = {
              phase: 'question',
              examType,
              questions,
              currentIndex: 0,
              answers: new Array(questions.length).fill(null),
              selectedAnswer: null,
              showFeedback: false,
            };
          }
          break;
        }

        case 'START_QUIZ': {
          if (prev.examType) {
            const questions = shuffleQuestions(getQuestionsByExamType(prev.examType));
            next = {
              ...prev,
              phase: 'question',
              questions,
              currentIndex: 0,
              answers: new Array(questions.length).fill(null),
              selectedAnswer: null,
              showFeedback: false,
            };
          }
          break;
        }

        case 'ANSWER_O':
        case 'ANSWER_X': {
          if (prev.phase === 'question' && !prev.showFeedback) {
            const answer = message.command === 'ANSWER_O';
            const newAnswers = [...prev.answers];
            newAnswers[prev.currentIndex] = answer;
            next = {
              ...prev,
              phase: 'answer_revealed',
              selectedAnswer: answer,
              showFeedback: true,
              answers: newAnswers,
            };
          }
          break;
        }

        case 'NEXT_QUESTION': {
          if (prev.showFeedback) {
            if (prev.currentIndex < prev.questions.length - 1) {
              next = {
                ...prev,
                phase: 'question',
                currentIndex: prev.currentIndex + 1,
                selectedAnswer: null,
                showFeedback: false,
              };
            } else {
              next = {
                ...prev,
                phase: 'result',
              };
            }
          }
          break;
        }

        case 'RESTART': {
          next = {
            phase: 'waiting',
            examType: null,
            questions: [],
            currentIndex: 0,
            answers: [],
            selectedAnswer: null,
            showFeedback: false,
          };
          break;
        }

        case 'END_QUIZ': {
          next = {
            ...prev,
            phase: 'result',
          };
          break;
        }

        default:
          return prev;
      }

      broadcastState(next);
      return next;
    });
  }, [broadcastState]);

  useEffect(() => {
    const unsubMessage = remoteControl.onMessage(handleCommand);

    const unsubState = remoteControl.onStateChange((state) => {
      if (state === 'disconnected' || state === 'error') {
        Alert.alert('연결 끊김', '서버와의 연결이 끊어졌습니다.', [
          { text: '확인', onPress: () => navigation.replace('RemoteControl') },
        ]);
      }
    });

    return () => {
      unsubMessage();
      unsubState();
      remoteControl.disconnect();
    };
  }, [handleCommand, navigation]);

  const handleExit = () => {
    Alert.alert('종료', '호스트를 종료하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '종료',
        style: 'destructive',
        onPress: () => {
          remoteControl.disconnect();
          navigation.replace('RemoteControl');
        },
      },
    ]);
  };

  const currentQuestion = quizState.questions[quizState.currentIndex];
  const examInfo = examInfoList.find((e) => e.id === quizState.examType);

  // 대기 화면
  if (quizState.phase === 'waiting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.statusBar}>
          <TouchableOpacity onPress={handleExit}>
            <Text style={styles.exitButton}>✕</Text>
          </TouchableOpacity>
          <View style={styles.roomInfo}>
            <Text style={styles.roomLabel}>방 코드</Text>
            <Text style={styles.roomCode}>{roomCode}</Text>
          </View>
          <View style={[
            styles.connectionDot,
            controllerConnected ? styles.dotConnected : styles.dotWaiting,
          ]} />
        </View>

        <View style={styles.waitingContent}>
          <Text style={styles.waitingIcon}>🖥️</Text>
          <Text style={styles.waitingTitle}>대기 중...</Text>
          <Text style={styles.waitingSubtitle}>
            {controllerConnected
              ? '컨트롤러가 연결되었습니다!\n시험 유형을 선택해주세요.'
              : '다른 기기에서 컨트롤러로 접속해주세요.'}
          </Text>
          <View style={styles.codeDisplay}>
            <Text style={styles.codeDisplayLabel}>방 코드</Text>
            <Text style={styles.codeDisplayValue}>{roomCode}</Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 결과 화면
  if (quizState.phase === 'result') {
    const correctCount = quizState.answers.filter(
      (a, i) => a === quizState.questions[i]?.answer
    ).length;
    const totalCount = quizState.questions.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

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
        <View style={styles.statusBar}>
          <TouchableOpacity onPress={handleExit}>
            <Text style={styles.exitButton}>✕</Text>
          </TouchableOpacity>
          <View style={styles.roomInfo}>
            <Text style={styles.roomLabel}>방 {roomCode}</Text>
          </View>
          <View style={[styles.connectionDot, controllerConnected ? styles.dotConnected : styles.dotWaiting]} />
        </View>

        <View style={styles.resultContent}>
          <Text style={styles.resultExamName}>{examInfo?.name}</Text>
          <View style={styles.resultScoreCircle}>
            <Text style={[styles.resultPercentage, { color: getScoreColor() }]}>
              {percentage}%
            </Text>
            <Text style={styles.resultDetail}>
              {correctCount} / {totalCount}
            </Text>
          </View>
          <Text style={styles.resultMessage}>{getScoreMessage()}</Text>
          <Text style={styles.resultHint}>
            컨트롤러에서 다시 시작하거나 종료할 수 있습니다
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 퀴즈 화면
  if (!currentQuestion) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>문제를 불러오는 중...</Text>
      </SafeAreaView>
    );
  }

  const progress = ((quizState.currentIndex + 1) / quizState.questions.length) * 100;
  const isCorrect = quizState.selectedAnswer === currentQuestion.answer;

  return (
    <SafeAreaView style={styles.container}>
      {/* 상단 바 */}
      <View style={styles.statusBar}>
        <TouchableOpacity onPress={handleExit}>
          <Text style={styles.exitButton}>✕</Text>
        </TouchableOpacity>
        <View style={styles.roomInfo}>
          <Text style={styles.headerTitle}>{examInfo?.name}</Text>
        </View>
        <Text style={styles.questionCount}>
          {quizState.currentIndex + 1} / {quizState.questions.length}
        </Text>
      </View>

      {/* 진행 바 */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress}%` }]} />
      </View>

      {/* 문제 */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionLabel}>Q{quizState.currentIndex + 1}</Text>
        <Text style={styles.questionText}>{currentQuestion.content}</Text>
      </View>

      {/* OX 표시 */}
      <View style={styles.displayAnswerContainer}>
        {quizState.showFeedback ? (
          <>
            <View style={styles.answerResultRow}>
              <View style={[
                styles.displayOX,
                quizState.selectedAnswer === true
                  ? (isCorrect ? styles.displayCorrect : styles.displayWrong)
                  : styles.displayInactive,
              ]}>
                <Text style={[
                  styles.displayOXText,
                  quizState.selectedAnswer === true && styles.displayOXTextActive,
                ]}>O</Text>
              </View>
              <View style={[
                styles.displayOX,
                quizState.selectedAnswer === false
                  ? (isCorrect ? styles.displayCorrect : styles.displayWrong)
                  : styles.displayInactive,
              ]}>
                <Text style={[
                  styles.displayOXText,
                  quizState.selectedAnswer === false && styles.displayOXTextActive,
                ]}>X</Text>
              </View>
            </View>
            <View style={[styles.feedbackBadge, isCorrect ? styles.correctBadge : styles.wrongBadge]}>
              <Text style={styles.feedbackBadgeText}>
                {isCorrect ? '정답입니다!' : '오답입니다'}
              </Text>
            </View>
            <Text style={styles.correctAnswerHint}>
              정답: {currentQuestion.answer ? 'O' : 'X'}
            </Text>
          </>
        ) : (
          <View style={styles.answerResultRow}>
            <View style={[styles.displayOX, styles.displayWaiting]}>
              <Text style={styles.displayOXTextWaiting}>O</Text>
            </View>
            <View style={[styles.displayOX, styles.displayWaiting]}>
              <Text style={styles.displayOXTextWaiting}>X</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controllerHint}>
        <View style={[styles.connectionDot, controllerConnected ? styles.dotConnected : styles.dotWaiting]} />
        <Text style={styles.controllerHintText}>
          {controllerConnected ? '컨트롤러 연결됨' : '컨트롤러 대기 중'}
        </Text>
      </View>
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
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  exitButton: {
    fontSize: 24,
    color: '#718096',
    padding: 4,
  },
  roomInfo: {
    alignItems: 'center',
  },
  roomLabel: {
    fontSize: 12,
    color: '#718096',
  },
  roomCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A365D',
    letterSpacing: 4,
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotConnected: {
    backgroundColor: '#48BB78',
  },
  dotWaiting: {
    backgroundColor: '#ECC94B',
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
    height: 6,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 20,
    borderRadius: 3,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4299E1',
    borderRadius: 3,
  },
  questionContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
  },
  questionLabel: {
    fontSize: 18,
    color: '#4299E1',
    fontWeight: '700',
    marginBottom: 16,
  },
  questionText: {
    fontSize: 26,
    lineHeight: 40,
    color: '#1A365D',
    fontWeight: '500',
  },
  displayAnswerContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  answerResultRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  displayOX: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
  },
  displayWaiting: {
    backgroundColor: '#EDF2F7',
    borderColor: '#CBD5E0',
  },
  displayInactive: {
    backgroundColor: '#EDF2F7',
    borderColor: '#CBD5E0',
    opacity: 0.4,
  },
  displayCorrect: {
    backgroundColor: '#48BB78',
    borderColor: '#2F855A',
  },
  displayWrong: {
    backgroundColor: '#FC8181',
    borderColor: '#C53030',
  },
  displayOXText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#4A5568',
  },
  displayOXTextActive: {
    color: '#FFFFFF',
  },
  displayOXTextWaiting: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#A0AEC0',
  },
  feedbackBadge: {
    paddingHorizontal: 24,
    paddingVertical: 10,
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1A365D',
  },
  correctAnswerHint: {
    fontSize: 16,
    color: '#4A5568',
  },
  controllerHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 20,
  },
  controllerHintText: {
    fontSize: 14,
    color: '#718096',
  },
  waitingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  waitingIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  waitingTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1A365D',
    marginBottom: 12,
  },
  waitingSubtitle: {
    fontSize: 18,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 40,
  },
  codeDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 40,
    paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  codeDisplayLabel: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  codeDisplayValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4299E1',
    letterSpacing: 12,
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  resultExamName: {
    fontSize: 18,
    color: '#718096',
    marginBottom: 24,
  },
  resultScoreCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 8,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  resultPercentage: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  resultDetail: {
    fontSize: 20,
    color: '#718096',
    marginTop: 4,
  },
  resultMessage: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 16,
  },
  resultHint: {
    fontSize: 15,
    color: '#A0AEC0',
    textAlign: 'center',
  },
});
