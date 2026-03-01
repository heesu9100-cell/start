import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { examInfoList, getQuestionsByExamType } from '../data/questions';
import { ExamType, StudyStats } from '../types';
import { getStudyStats, getRecentRecords } from '../utils/storage';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[]; startTime: number };
  Stats: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [stats, setStats] = useState<StudyStats | null>(null);
  const [recentCount, setRecentCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [])
  );

  const loadStats = async () => {
    const s = await getStudyStats();
    setStats(s);
    const records = await getRecentRecords(5);
    setRecentCount(records.length);
  };

  const handleExamSelect = (examType: ExamType) => {
    navigation.navigate('Quiz', { examType });
  };

  const getExamQuestionCount = (examType: ExamType) => {
    return getQuestionsByExamType(examType).length;
  };

  const getExamProgress = (examType: ExamType) => {
    if (!stats) return null;
    const examStats = stats.byExamType[examType];
    if (examStats.sessions === 0) return null;
    return examStats;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>LAWPLAY</Text>
              <Text style={styles.title}>헌법 OX</Text>
            </View>
            <TouchableOpacity
              style={styles.statsButton}
              onPress={() => navigation.navigate('Stats')}
            >
              <Text style={styles.statsButtonIcon}>📊</Text>
              <Text style={styles.statsButtonText}>통계</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>공무원·변호사 시험 헌법 문제풀이</Text>
        </View>

        {/* Quick Stats Banner */}
        {stats && stats.totalSessions > 0 && (
          <View style={styles.quickStats}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{stats.totalSessions}</Text>
              <Text style={styles.quickStatLabel}>총 세션</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{stats.averagePercentage}%</Text>
              <Text style={styles.quickStatLabel}>평균 정답률</Text>
            </View>
            <View style={styles.quickStatDivider} />
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{stats.streakDays}일</Text>
              <Text style={styles.quickStatLabel}>연속 학습</Text>
            </View>
          </View>
        )}

        {/* Exam List */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>시험 선택</Text>
          <Text style={styles.sectionDesc}>원하는 시험 유형을 선택하세요</Text>
        </View>

        <View style={styles.examList}>
          {examInfoList.map((exam) => {
            const progress = getExamProgress(exam.id);
            const questionCount = getExamQuestionCount(exam.id);

            return (
              <TouchableOpacity
                key={exam.id}
                style={styles.examCard}
                onPress={() => handleExamSelect(exam.id)}
                activeOpacity={0.7}
              >
                <View style={styles.examCardInner}>
                  <View style={styles.examIconContainer}>
                    <Text style={styles.examIcon}>{exam.icon}</Text>
                  </View>
                  <View style={styles.examInfo}>
                    <Text style={styles.examName}>{exam.name}</Text>
                    <Text style={styles.examDescription}>{exam.description}</Text>
                    <View style={styles.examMeta}>
                      <View style={styles.examBadge}>
                        <Text style={styles.examBadgeText}>{questionCount}문제</Text>
                      </View>
                      {progress && (
                        <View style={[styles.examBadge, styles.examBadgeAccent]}>
                          <Text style={[styles.examBadgeText, styles.examBadgeAccentText]}>
                            정답률 {progress.averagePercentage}%
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.arrowContainer}>
                    <Text style={styles.arrow}>›</Text>
                  </View>
                </View>

                {/* Progress bar for exam */}
                {progress && (
                  <View style={styles.examProgressContainer}>
                    <View
                      style={[
                        styles.examProgressBar,
                        { width: `${progress.averagePercentage}%` },
                        progress.averagePercentage >= 80 && styles.examProgressGreen,
                        progress.averagePercentage >= 60 && progress.averagePercentage < 80 && styles.examProgressYellow,
                        progress.averagePercentage < 60 && styles.examProgressRed,
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info Section */}
        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>💡</Text>
          <Text style={styles.infoText}>
            문제를 풀고 해설에서 관련 조문과 판례를 확인하세요.{'\n'}
            학습 기록이 자동으로 저장됩니다.
          </Text>
        </View>

        {/* Feature Highlights */}
        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📝</Text>
            <Text style={styles.featureText}>총 60문제</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📖</Text>
            <Text style={styles.featureText}>상세 해설</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📊</Text>
            <Text style={styles.featureText}>학습 통계</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔖</Text>
            <Text style={styles.featureText}>북마크</Text>
          </View>
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
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginTop: 20,
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '700',
    color: '#60A5FA',
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginTop: 4,
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statsButtonIcon: {
    fontSize: 16,
  },
  statsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  // Quick Stats
  quickStats: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#334155',
  },
  quickStatItem: {
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  quickStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334155',
  },
  // Section
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 14,
    color: '#94A3B8',
  },
  // Exam List
  examList: {
    gap: 12,
    marginBottom: 24,
  },
  examCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  examCardInner: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  examIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  examIcon: {
    fontSize: 28,
  },
  examInfo: {
    flex: 1,
  },
  examName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 3,
  },
  examDescription: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 8,
  },
  examMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  examBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  examBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
  },
  examBadgeAccent: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  examBadgeAccentText: {
    color: '#60A5FA',
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  arrow: {
    fontSize: 20,
    color: '#60A5FA',
    fontWeight: 'bold',
  },
  examProgressContainer: {
    height: 3,
    backgroundColor: '#0F172A',
  },
  examProgressBar: {
    height: '100%',
    borderRadius: 2,
  },
  examProgressGreen: {
    backgroundColor: '#34D399',
  },
  examProgressYellow: {
    backgroundColor: '#FBBF24',
  },
  examProgressRed: {
    backgroundColor: '#F87171',
  },
  // Info Card
  infoCard: {
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.2)',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 20,
  },
  // Features
  features: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureItem: {
    alignItems: 'center',
    gap: 6,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
