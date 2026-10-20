import { io, Socket } from 'socket.io-client';

// In development, Vite proxies /socket.io to http://localhost:4000
// When accessing via network or deployed, connects to current host
const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || (
  typeof window !== 'undefined' && window.location.port === '5173'
    ? `http://${window.location.hostname}:4000`
    : '/'
);

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  transports: ['websocket', 'polling']
});

