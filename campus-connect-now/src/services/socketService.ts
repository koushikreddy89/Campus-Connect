import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
const SOCKET_URL = 'http://localhost:5000';

export const socketService = {
  connect(token?: string) {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Connected to Socket.IO server');
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Disconnected from Socket.IO server:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 Socket connection error:', error.message);
    });

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  joinRoom(roomId: string) {
    if (socket?.connected) {
      socket.emit('join_room', { roomId });
      console.log(`📡 Requesting room join: ${roomId}`);
    }
  },

  leaveRoom(roomId: string) {
    if (socket?.connected) {
      socket.emit('leave_room', { roomId });
      console.log(`📡 Requesting room leave: ${roomId}`);
    }
  },

  sendTyping(roomId: string, userId: string, isTyping: boolean) {
    if (socket?.connected) {
      socket.emit('typing', { roomId, userId, isTyping });
    }
  }
};
