import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { examInfoList } from '../data/questions';
import { ExamType } from '../types';

type RootStackParamList = {
  Home: undefined;
  Quiz: { examType: ExamType };
  Result: { examType: ExamType; answers: (boolean | null)[]; questionIds: string[] };
  RemoteControl: undefined;
};

type HomeScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const handleExamSelect = (examType: ExamType) => {
    navigation.navigate('Quiz', { examType });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>헌법 OX</Text>
          <Text style={styles.subtitle}>공무원/변호사 시험 헌법 문제풀이</Text>
        </View>

        <View style={styles.examList}>
          {examInfoList.map((exam) => (
            <TouchableOpacity
              key={exam.id}
              style={styles.examCard}
              onPress={() => handleExamSelect(exam.id)}
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
        </View>

        {/* 리모컨 버튼 */}
        <TouchableOpacity
          style={styles.remoteButton}
          onPress={() => navigation.navigate('RemoteControl')}
          activeOpacity={0.8}
        >
          <Text style={styles.remoteIcon}>📡</Text>
          <View style={styles.remoteInfo}>
            <Text style={styles.remoteName}>리모컨</Text>
            <Text style={styles.remoteDescription}>다른 기기에서 퀴즈를 원격 제어</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            문제를 풀고 해설에서 관련 조문과 판례를 확인하세요
          </Text>
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
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A365D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#4A5568',
  },
  examList: {
    gap: 16,
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
    fontSize: 40,
    marginRight: 16,
  },
  examInfo: {
    flex: 1,
  },
  examName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 4,
  },
  examDescription: {
    fontSize: 14,
    color: '#718096',
  },
  arrow: {
    fontSize: 24,
    color: '#4299E1',
  },
  remoteButton: {
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
    marginTop: 24,
    borderWidth: 2,
    borderColor: '#9F7AEA',
  },
  remoteIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  remoteInfo: {
    flex: 1,
  },
  remoteName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#553C9A',
    marginBottom: 4,
  },
  remoteDescription: {
    fontSize: 14,
    color: '#9F7AEA',
  },
  footer: {
    marginTop: 40,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
});
