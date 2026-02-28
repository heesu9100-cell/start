import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import {
  ExamType,
  RemoteMessage,
  DisplayQuizPhase,
  Question,
} from '../types';
import { examInfoList } from '../data/questions';
import { remoteControl } from '../utils/remoteControl';

type RootStackParamList = {
  Home: undefined;
  RemoteControl: undefined;
  Display: { roomCode: string };
  Controller: { roomCode: string };
};

type ControllerScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Controller'>;
  route: RouteProp<RootStackParamList, 'Controller'>;
};

interface HostState {
  phase: DisplayQuizPhase;
  examType: ExamType | null;
  currentIndex: number;
  totalQuestions: number;
  currentQuestion: Question | null;
  selectedAnswer: boolean | null;
  showFeedback: boolean;
  answers: (boolean | null)[];
  questions: Question[];
}

export default function ControllerScreen({ navigation, route }: ControllerScreenProps) {
  const { roomCode } = route.params;
  const [hostState, setHostState] = useState<HostState>({
    phase: 'waiting',
    examType: null,
    currentIndex: 0,
    totalQuestions: 0,
    currentQuestion: null,
    selectedAnswer: null,
    showFeedback: false,
    answers: [],
    questions: [],
  });

  useEffect(() => {
    const unsubMessage = remoteControl.onMessage((message: RemoteMessage) => {
      if (message.type === 'STATE_UPDATE' && message.payload) {
        setHostState(message.payload);
      } else if (message.type === 'PEER_LEFT') {
        Alert.alert('호스트 종료', '호스트가 연결을 종료했습니다.', [
          { text: '확인', onPress: () => handleExit() },
        ]);
      }
    });

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
  }, [navigation]);

  const handleExit = () => {
    remoteControl.disconnect();
    navigation.replace('RemoteControl');
  };

  const sendCommand = (command: RemoteMessage['command'], payload?: any) => {
    remoteControl.sendCommand(command, payload);
  };

  const examInfo = examInfoList.find((e) => e.id === hostState.examType);

  // 시험 선택 화면 (대기 중)
  if (hostState.phase === 'waiting') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {
            Alert.alert('종료', '컨트롤러를 종료하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              { text: '종료', style: 'destructive', onPress: handleExit },
            ]);
          }}>
            <Text style={styles.exitButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>리모컨</Text>
          <Text style={styles.roomCodeBadge}>{roomCode}</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>시험 유형 선택</Text>
          <Text style={styles.sectionSubtitle}>
            시험을 선택하면 호스트 화면에서 퀴즈가 시작됩니다
          </Text>

          {examInfoList.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => sendCommand('SELECT_EXAM', { examType: exam.id })}
              activeOpacity={0.8}
            >
              <Text style={styles.examIcon}>{exam.icon}</Text>
              <View style={styles.examInfo}>
                <Text style={styles.examName}>{exam.name}</Text>
                <Text style={styles.examDescription}>{exam.description}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // 결과 화면
  if (hostState.phase === 'result') {
    const correctCount = hostState.answers.filter(
      (a, i) => a === hostState.questions[i]?.answer
    ).length;
    const totalCount = hostState.questions.length;
    const percentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleExit}>
            <Text style={styles.exitButton}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>결과</Text>
          <Text style={styles.roomCodeBadge}>{roomCode}</Text>
        </View>

        <View style={styles.resultContent}>
          <Text style={styles.resultScore}>{percentage}%</Text>
          <Text style={styles.resultDetail}>
            {correctCount} / {totalCount} 정답
          </Text>

          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.controlButtonPrimary}
              onPress={() => sendCommand('RESTART')}
            >
              <Text style={styles.controlButtonPrimaryText}>다시 시작</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButtonSecondary}
              onPress={handleExit}
            >
              <Text style={styles.controlButtonSecondaryText}>종료</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 퀴즈 컨트롤러 화면
  const isAnswered = hostState.showFeedback;
  const isLastQuestion = hostState.currentIndex >= hostState.totalQuestions - 1;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          Alert.alert('종료', '퀴즈를 종료하시겠습니까?', [
            { text: '취소', style: 'cancel' },
            { text: '종료', style: 'destructive', onPress: () => sendCommand('END_QUIZ') },
          ]);
        }}>
          <Text style={styles.exitButton}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{examInfo?.name || '퀴즈'}</Text>
        <Text style={styles.roomCodeBadge}>{roomCode}</Text>
      </View>

      {/* 진행 상태 */}
      <View style={styles.progressInfo}>
        <View style={styles.progressContainer}>
          <View style={[
            styles.progressBar,
            { width: `${hostState.totalQuestions > 0 ? ((hostState.currentIndex + 1) / hostState.totalQuestions) * 100 : 0}%` },
          ]} />
        </View>
        <Text style={styles.progressText}>
          문제 {hostState.currentIndex + 1} / {hostState.totalQuestions}
        </Text>
      </View>

      {/* 현재 문제 미리보기 */}
      {hostState.currentQuestion && (
        <View style={styles.questionPreview}>
          <Text style={styles.questionPreviewLabel}>Q{hostState.currentIndex + 1}</Text>
          <Text style={styles.questionPreviewText} numberOfLines={3}>
            {hostState.currentQuestion.content}
          </Text>
        </View>
      )}

      {/* 컨트롤 버튼 */}
      <View style={styles.controlArea}>
        {!isAnswered ? (
          <>
            <Text style={styles.controlLabel}>답을 선택하세요</Text>
            <View style={styles.oxButtons}>
              <TouchableOpacity
                style={[styles.oxButton, styles.oButton]}
                onPress={() => sendCommand('ANSWER_O')}
                activeOpacity={0.7}
              >
                <Text style={styles.oxButtonText}>O</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.oxButton, styles.xButton]}
                onPress={() => sendCommand('ANSWER_X')}
                activeOpacity={0.7}
              >
                <Text style={styles.oxButtonText}>X</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            {hostState.currentQuestion && (
              <View style={styles.feedbackInfo}>
                <Text style={[
                  styles.feedbackText,
                  hostState.selectedAnswer === hostState.currentQuestion.answer
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong,
                ]}>
                  {hostState.selectedAnswer === hostState.currentQuestion.answer
                    ? '정답!'
                    : '오답'}
                </Text>
                <Text style={styles.feedbackAnswer}>
                  선택: {hostState.selectedAnswer ? 'O' : 'X'} / 정답: {hostState.currentQuestion.answer ? 'O' : 'X'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={() => sendCommand('NEXT_QUESTION')}
              activeOpacity={0.7}
            >
              <Text style={styles.nextButtonText}>
                {isLastQuestion ? '결과 보기' : '다음 문제 →'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* 하단 액션 */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.endButton}
          onPress={() => {
            Alert.alert('퀴즈 종료', '퀴즈를 종료하고 결과를 확인하시겠습니까?', [
              { text: '취소', style: 'cancel' },
              { text: '종료', onPress: () => sendCommand('END_QUIZ') },
            ]);
          }}
        >
          <Text style={styles.endButtonText}>퀴즈 종료</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  header: {
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
  },
  roomCodeBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A365D',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 24,
  },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  examIcon: {
    fontSize: 36,
    marginRight: 16,
  },
  examInfo: {
    flex: 1,
  },
  examName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 4,
  },
  examDescription: {
    fontSize: 13,
    color: '#718096',
  },
  arrow: {
    fontSize: 22,
    color: '#4299E1',
  },
  progressInfo: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  progressContainer: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4299E1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  questionPreview: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  questionPreviewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4299E1',
    marginBottom: 8,
  },
  questionPreviewText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#2D3748',
  },
  controlArea: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  controlLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4A5568',
    textAlign: 'center',
    marginBottom: 20,
  },
  oxButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  oxButton: {
    flex: 1,
    height: 140,
    borderRadius: 20,
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
  oxButtonText: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#1A365D',
  },
  feedbackInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  feedbackText: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedbackCorrect: {
    color: '#2F855A',
  },
  feedbackWrong: {
    color: '#C53030',
  },
  feedbackAnswer: {
    fontSize: 16,
    color: '#718096',
  },
  nextButton: {
    backgroundColor: '#4299E1',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomActions: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 16,
  },
  endButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  endButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#718096',
  },
  resultContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  resultScore: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#1A365D',
    marginBottom: 8,
  },
  resultDetail: {
    fontSize: 20,
    color: '#718096',
    marginBottom: 40,
  },
  resultActions: {
    width: '100%',
    gap: 12,
  },
  controlButtonPrimary: {
    backgroundColor: '#4299E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  controlButtonPrimaryText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  controlButtonSecondary: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
  },
  controlButtonSecondaryText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#718096',
  },
});
