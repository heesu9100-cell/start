import { RemoteMessage, RemoteMessageType, ConnectionState } from '../types';

type MessageHandler = (message: RemoteMessage) => void;
type StateChangeHandler = (state: ConnectionState) => void;

const DEFAULT_SERVER_URL = 'ws://localhost:8080';

class RemoteControlManager {
  private ws: WebSocket | null = null;
  private serverUrl: string = DEFAULT_SERVER_URL;
  private messageHandlers: MessageHandler[] = [];
  private stateChangeHandlers: StateChangeHandler[] = [];
  private connectionState: ConnectionState = 'disconnected';
  private roomCode: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  setServerUrl(url: string) {
    this.serverUrl = url;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  getRoomCode(): string | null {
    return this.roomCode;
  }

  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter((h) => h !== handler);
    };
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateChangeHandlers.push(handler);
    return () => {
      this.stateChangeHandlers = this.stateChangeHandlers.filter((h) => h !== handler);
    };
  }

  private setConnectionState(state: ConnectionState) {
    this.connectionState = state;
    this.stateChangeHandlers.forEach((h) => h(state));
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.close();
      }

      this.setConnectionState('connecting');

      try {
        this.ws = new WebSocket(this.serverUrl);

        this.ws.onopen = () => {
          this.setConnectionState('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: RemoteMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (e) {
            console.warn('Failed to parse message:', e);
          }
        };

        this.ws.onclose = () => {
          this.setConnectionState('disconnected');
          this.ws = null;
        };

        this.ws.onerror = () => {
          this.setConnectionState('error');
          reject(new Error('WebSocket connection failed'));
        };
      } catch (e) {
        this.setConnectionState('error');
        reject(e);
      }
    });
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.roomCode = null;
    this.setConnectionState('disconnected');
  }

  private handleMessage(message: RemoteMessage) {
    if (message.type === 'ROOM_CREATED' || message.type === 'ROOM_JOINED') {
      this.roomCode = message.roomCode || null;
    }
    this.messageHandlers.forEach((h) => h(message));
  }

  send(message: RemoteMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  createRoom() {
    this.send({ type: 'CREATE_ROOM' });
  }

  joinRoom(roomCode: string) {
    this.send({ type: 'JOIN_ROOM', roomCode });
  }

  sendCommand(command: RemoteMessage['command'], payload?: any) {
    this.send({
      type: 'COMMAND',
      roomCode: this.roomCode || undefined,
      command,
      payload,
    });
  }

  sendStateUpdate(payload: any) {
    this.send({
      type: 'STATE_UPDATE',
      roomCode: this.roomCode || undefined,
      payload,
    });
  }
}

// 싱글톤 인스턴스
export const remoteControl = new RemoteControlManager();

// 방 코드 생성 유틸리티 (서버에서 사용)
export function generateRoomCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
