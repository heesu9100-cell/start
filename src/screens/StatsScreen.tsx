import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { ExamType, StudyStats, StudyRecord } from '../types';
import { getStudyStats, getRecentRecords, clearAllData } from '../utils/storage';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[]; startTime: number };
  Stats: undefined;
};

type StatsScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Stats'>;
};

const examNames: Record<ExamType, string> = {
  grade5: '5급공채',
  legislative: '입법고시',
  bar: '변호사시험',
};

const examIcons: Record<ExamType, string> = {
  grade5: '📚',
  legislative: '⚖️',
  bar: '👨‍⚖️',
};

export default function StatsScreen({ navigation }: StatsScreenProps) {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [recentRecords, setRecentRecords] = useState<StudyRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const s = await getStudyStats();
    setStats(s);
    const records = await getRecentRecords(10);
    setRecentRecords(records);
  };

  const handleReset = () => {
    Alert.alert(
      '데이터 초기화',
      '모든 학습 기록이 삭제됩니다. 계속하시겠습니까?',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '초기화',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            setStats(null);
            setRecentRecords([]);
          },
        },
      ]
    );
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hour = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    return `${month}/${day} ${hour}:${min}`;
  };

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    if (min === 0) return `${sec}초`;
    return `${min}분 ${sec}초`;
  };

  const getPercentageColor = (pct: number) => {
    if (pct >= 80) return '#34D399';
    if (pct >= 60) return '#FBBF24';
    return '#F87171';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>학습 통계</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Text style={styles.resetText}>초기화</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!stats || stats.totalSessions === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyTitle}>아직 학습 기록이 없어요</Text>
            <Text style={styles.emptyDesc}>
              퀴즈를 풀고 나면 여기에서 학습 통계를 확인할 수 있습니다.
            </Text>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Text style={styles.startButtonText}>학습 시작하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Overview Cards */}
            <View style={styles.overviewGrid}>
              <View style={styles.overviewCard}>
                <Text style={styles.overviewValue}>{stats.totalSessions}</Text>
                <Text style={styles.overviewLabel}>총 세션</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewValue, { color: getPercentageColor(stats.averagePercentage) }]}>
                  {stats.averagePercentage}%
                </Text>
                <Text style={styles.overviewLabel}>평균 정답률</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewValue, { color: '#34D399' }]}>
                  {stats.bestPercentage}%
                </Text>
                <Text style={styles.overviewLabel}>최고 기록</Text>
              </View>
              <View style={styles.overviewCard}>
                <Text style={[styles.overviewValue, { color: '#FBBF24' }]}>
                  {stats.streakDays}일
                </Text>
                <Text style={styles.overviewLabel}>연속 학습</Text>
              </View>
            </View>

            {/* Total Progress */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>전체 학습 현황</Text>
              <View style={styles.totalCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>풀어본 문제</Text>
                  <Text style={styles.totalValue}>{stats.totalQuestions}문제</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>맞힌 문제</Text>
                  <Text style={[styles.totalValue, { color: '#34D399' }]}>
                    {stats.totalCorrect}문제
                  </Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>틀린 문제</Text>
                  <Text style={[styles.totalValue, { color: '#F87171' }]}>
                    {stats.totalQuestions - stats.totalCorrect}문제
                  </Text>
                </View>
                {/* Progress bar */}
                <View style={styles.totalProgressContainer}>
                  <View
                    style={[
                      styles.totalProgressBar,
                      {
                        width: `${stats.averagePercentage}%`,
                        backgroundColor: getPercentageColor(stats.averagePercentage),
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            {/* By Exam Type */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>시험 유형별 성적</Text>
              {(['grade5', 'legislative', 'bar'] as ExamType[]).map((type) => {
                const examStats = stats.byExamType[type];
                if (examStats.sessions === 0) return null;
                return (
                  <View key={type} style={styles.examStatCard}>
                    <View style={styles.examStatHeader}>
                      <Text style={styles.examStatIcon}>{examIcons[type]}</Text>
                      <View style={styles.examStatInfo}>
                        <Text style={styles.examStatName}>{examNames[type]}</Text>
                        <Text style={styles.examStatSessions}>
                          {examStats.sessions}회 응시 · {examStats.totalQuestions}문제
                        </Text>
                      </View>
                      <View style={styles.examStatScore}>
                        <Text style={[
                          styles.examStatPercentage,
                          { color: getPercentageColor(examStats.averagePercentage) },
                        ]}>
                          {examStats.averagePercentage}%
                        </Text>
                      </View>
                    </View>
                    <View style={styles.examProgressContainer}>
                      <View
                        style={[
                          styles.examProgressBar,
                          {
                            width: `${examStats.averagePercentage}%`,
                            backgroundColor: getPercentageColor(examStats.averagePercentage),
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Recent Records */}
            {recentRecords.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>최근 학습 기록</Text>
                {recentRecords.map((record, index) => (
                  <View key={record.id} style={styles.recordItem}>
                    <View style={styles.recordLeft}>
                      <Text style={styles.recordIcon}>{examIcons[record.examType]}</Text>
                      <View>
                        <Text style={styles.recordName}>{examNames[record.examType]}</Text>
                        <Text style={styles.recordDate}>{formatDate(record.completedAt)}</Text>
                      </View>
                    </View>
                    <View style={styles.recordRight}>
                      <Text style={[
                        styles.recordPercentage,
                        { color: getPercentageColor(record.percentage) },
                      ]}>
                        {record.percentage}%
                      </Text>
                      <Text style={styles.recordDetail}>
                        {record.correctAnswers}/{record.totalQuestions} · {formatTime(record.elapsedSeconds)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 15,
    color: '#60A5FA',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  resetButton: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  resetText: {
    fontSize: 14,
    color: '#F87171',
    fontWeight: '600',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  startButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 14,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Overview Grid
  overviewGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  overviewCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  overviewValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  overviewLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 12,
  },
  // Total Card
  totalCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  totalLabel: {
    fontSize: 14,
    color: '#94A3B8',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  totalProgressContainer: {
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    marginTop: 14,
    overflow: 'hidden',
  },
  totalProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  // Exam Stats
  examStatCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  examStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  examStatIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  examStatInfo: {
    flex: 1,
  },
  examStatName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 2,
  },
  examStatSessions: {
    fontSize: 12,
    color: '#94A3B8',
  },
  examStatScore: {
    alignItems: 'center',
  },
  examStatPercentage: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  examProgressContainer: {
    height: 4,
    backgroundColor: '#0F172A',
    borderRadius: 2,
    overflow: 'hidden',
  },
  examProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  // Records
  recordItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  recordLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recordIcon: {
    fontSize: 24,
  },
  recordName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  recordDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  recordRight: {
    alignItems: 'flex-end',
  },
  recordPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  recordDetail: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
