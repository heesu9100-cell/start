const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });

// 방 관리: roomCode -> { host: ws, controller: ws }
const rooms = new Map();

function generateRoomCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (rooms.has(code));
  return code;
}

function send(ws, message) {
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}

wss.on('connection', (ws) => {
  let currentRoom = null;
  let role = null; // 'host' or 'controller'

  ws.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (message.type) {
      case 'CREATE_ROOM': {
        const roomCode = generateRoomCode();
        rooms.set(roomCode, { host: ws, controller: null });
        currentRoom = roomCode;
        role = 'host';
        send(ws, { type: 'ROOM_CREATED', roomCode });
        console.log(`Room ${roomCode} created`);
        break;
      }

      case 'JOIN_ROOM': {
        const { roomCode } = message;
        const room = rooms.get(roomCode);
        if (!room) {
          send(ws, { type: 'ERROR', payload: { message: '존재하지 않는 방 코드입니다.' } });
          return;
        }
        if (room.controller) {
          send(ws, { type: 'ERROR', payload: { message: '이미 컨트롤러가 연결되어 있습니다.' } });
          return;
        }
        room.controller = ws;
        currentRoom = roomCode;
        role = 'controller';
        send(ws, { type: 'ROOM_JOINED', roomCode });
        send(room.host, { type: 'PEER_JOINED', roomCode });
        console.log(`Controller joined room ${roomCode}`);
        break;
      }

      case 'COMMAND': {
        // 컨트롤러 -> 호스트로 명령 전달
        if (currentRoom && role === 'controller') {
          const room = rooms.get(currentRoom);
          if (room && room.host) {
            send(room.host, message);
          }
        }
        break;
      }

      case 'STATE_UPDATE': {
        // 호스트 -> 컨트롤러로 상태 전달
        if (currentRoom && role === 'host') {
          const room = rooms.get(currentRoom);
          if (room && room.controller) {
            send(room.controller, message);
          }
        }
        break;
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room) {
        if (role === 'host') {
          // 호스트 종료 -> 컨트롤러에 알림
          if (room.controller) {
            send(room.controller, { type: 'PEER_LEFT', roomCode: currentRoom });
          }
          rooms.delete(currentRoom);
          console.log(`Room ${currentRoom} closed (host left)`);
        } else if (role === 'controller') {
          // 컨트롤러 종료 -> 호스트에 알림
          room.controller = null;
          if (room.host) {
            send(room.host, { type: 'PEER_LEFT', roomCode: currentRoom });
          }
          console.log(`Controller left room ${currentRoom}`);
        }
      }
    }
  });

  ws.on('error', (err) => {
    console.error('WebSocket error:', err.message);
  });
});

console.log(`WebSocket relay server running on ws://localhost:${PORT}`);
