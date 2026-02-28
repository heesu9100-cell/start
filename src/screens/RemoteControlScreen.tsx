import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ConnectionState, RemoteMessage } from '../types';
import { remoteControl } from '../utils/remoteControl';

type RootStackParamList = {
  Home: undefined;
  RemoteControl: undefined;
  Display: { roomCode: string };
  Controller: { roomCode: string };
};

type RemoteControlScreenProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RemoteControl'>;
};

export default function RemoteControlScreen({ navigation }: RemoteControlScreenProps) {
  const [mode, setMode] = useState<'select' | 'host' | 'join'>('select');
  const [serverUrl, setServerUrl] = useState(remoteControl.getServerUrl());
  const [roomCode, setRoomCode] = useState('');
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);

  useEffect(() => {
    const unsubState = remoteControl.onStateChange((state) => {
      setConnectionState(state);
    });

    const unsubMessage = remoteControl.onMessage((message: RemoteMessage) => {
      if (message.type === 'ROOM_CREATED' && message.roomCode) {
        setIsConnecting(false);
        navigation.replace('Display', { roomCode: message.roomCode });
      } else if (message.type === 'ROOM_JOINED' && message.roomCode) {
        setIsConnecting(false);
        navigation.replace('Controller', { roomCode: message.roomCode });
      } else if (message.type === 'ERROR') {
        setIsConnecting(false);
        Alert.alert('오류', message.payload?.message || '연결에 실패했습니다.');
      }
    });

    return () => {
      unsubState();
      unsubMessage();
    };
  }, [navigation]);

  const handleConnect = useCallback(async (action: 'host' | 'join') => {
    setIsConnecting(true);
    remoteControl.setServerUrl(serverUrl);

    try {
      await remoteControl.connect();
      if (action === 'host') {
        remoteControl.createRoom();
      } else {
        if (roomCode.length !== 4) {
          Alert.alert('오류', '4자리 방 코드를 입력해주세요.');
          setIsConnecting(false);
          return;
        }
        remoteControl.joinRoom(roomCode);
      }
    } catch {
      setIsConnecting(false);
      Alert.alert(
        '연결 실패',
        '서버에 연결할 수 없습니다.\n서버 주소를 확인해주세요.',
        [{ text: '확인' }]
      );
    }
  }, [serverUrl, roomCode]);

  if (mode === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>← 뒤로</Text>
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>리모컨</Text>
            <Text style={styles.subtitle}>
              다른 기기에서 퀴즈를 원격으로 제어하세요
            </Text>
          </View>

          <View style={styles.modeCards}>
            <TouchableOpacity
              style={[styles.modeCard, styles.hostCard]}
              onPress={() => setMode('host')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeIcon}>🖥️</Text>
              <Text style={styles.modeTitle}>호스트 (화면)</Text>
              <Text style={styles.modeDescription}>
                이 기기에 퀴즈를 표시합니다.{'\n'}
                TV나 프로젝터에 연결하세요.
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeCard, styles.controllerCard]}
              onPress={() => setMode('join')}
              activeOpacity={0.8}
            >
              <Text style={styles.modeIcon}>📱</Text>
              <Text style={styles.modeTitle}>컨트롤러 (리모컨)</Text>
              <Text style={styles.modeDescription}>
                이 기기로 퀴즈를 제어합니다.{'\n'}
                방 코드를 입력하여 연결하세요.
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.serverConfigButton}
            onPress={() => setShowServerConfig(!showServerConfig)}
          >
            <Text style={styles.serverConfigButtonText}>
              서버 설정 {showServerConfig ? '▲' : '▼'}
            </Text>
          </TouchableOpacity>

          {showServerConfig && (
            <View style={styles.serverConfig}>
              <Text style={styles.serverLabel}>WebSocket 서버 주소</Text>
              <TextInput
                style={styles.serverInput}
                value={serverUrl}
                onChangeText={setServerUrl}
                placeholder="ws://localhost:8080"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            remoteControl.disconnect();
            setMode('select');
          }}
        >
          <Text style={styles.backButtonText}>← 뒤로</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'host' ? '🖥️ 호스트 모드' : '📱 컨트롤러 모드'}
          </Text>
          <Text style={styles.subtitle}>
            {mode === 'host'
              ? '방을 생성하고 다른 기기에서 제어하세요'
              : '방 코드를 입력하여 연결하세요'}
          </Text>
        </View>

        {mode === 'join' && (
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>방 코드 (4자리)</Text>
            <TextInput
              style={styles.codeInput}
              value={roomCode}
              onChangeText={(text) => setRoomCode(text.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="0000"
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
            />
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.connectButton,
            isConnecting && styles.connectButtonDisabled,
          ]}
          onPress={() => handleConnect(mode)}
          disabled={isConnecting}
        >
          {isConnecting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.connectButtonText}>
              {mode === 'host' ? '방 생성' : '참가'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.serverConfig}>
          <Text style={styles.serverLabel}>서버: {serverUrl}</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#4299E1',
    fontWeight: '500',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A365D',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
  },
  modeCards: {
    gap: 16,
    marginBottom: 30,
  },
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
  },
  hostCard: {
    borderColor: '#4299E1',
  },
  controllerCard: {
    borderColor: '#9F7AEA',
  },
  modeIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  modeTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A365D',
    marginBottom: 8,
  },
  modeDescription: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
  },
  serverConfigButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  serverConfigButtonText: {
    fontSize: 14,
    color: '#718096',
  },
  serverConfig: {
    marginTop: 10,
    padding: 16,
    backgroundColor: '#EDF2F7',
    borderRadius: 12,
  },
  serverLabel: {
    fontSize: 13,
    color: '#718096',
    marginBottom: 8,
  },
  serverInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2D3748',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  inputLabel: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 12,
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 30,
    paddingVertical: 16,
    fontSize: 36,
    fontWeight: 'bold',
    color: '#1A365D',
    letterSpacing: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    minWidth: 200,
  },
  connectButton: {
    backgroundColor: '#4299E1',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  connectButtonDisabled: {
    backgroundColor: '#A0AEC0',
  },
  connectButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
