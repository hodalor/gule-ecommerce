import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket && this.isConnected) {
      return this.socket;
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.socket.on('connect', () => {
      console.log('Connected to server via WebSocket');
      this.isConnected = true;
      
      // Authenticate the socket connection
      const token = localStorage.getItem('token');
      if (token) {
        this.socket.emit('authenticate', token);
      }
    });

    this.socket.on('authenticated', (data) => {
      console.log('Socket authenticated:', data);
      // Join admin room for real-time updates
      this.socket.emit('join_admin');
    });

    this.socket.on('joined_admin', (data) => {
      console.log('Joined admin room:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.listeners.clear();
    }
  }

  on(event, callback) {
    if (!this.socket) {
      this.connect();
    }
    
    this.socket.on(event, callback);
    
    // Store the listener for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    
    // Remove from stored listeners
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    }
  }

  // Specific methods for log updates
  onLogUpdate(callback) {
    this.on('log_update', callback);
  }

  onAuditLogUpdate(callback) {
    this.on('audit_log_update', callback);
  }

  offLogUpdate(callback) {
    this.off('log_update', callback);
  }

  offAuditLogUpdate(callback) {
    this.off('audit_log_update', callback);
  }
}

// Create a singleton instance
const socketService = new SocketService();

export default socketService;