class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.userColor = null;
    this.drawingState = new DrawingState();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }
  
  connect() {
    try {
      // Connect to server - use relative path for production
      const socketUrl = window.location.origin;
      this.socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 10000
      });
      
      this.setupEventHandlers();
      
    } catch (error) {
      console.error('Failed to connect to server:', error);
      this.handleConnectionError();
    }
  }
  
  setupEventHandlers() {
    // Connection events
    this.socket.on('connect', () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
      console.log('✅ Connected to server');
    });
    
    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      this.updateConnectionStatus(false);
      console.log('❌ Disconnected from server. Reason:', reason);
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, need to manually reconnect
        setTimeout(() => this.socket.connect(), 1000);
      }
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      this.handleConnectionError();
    });
    
    // Initialize canvas
    this.socket.on('init-canvas', (data) => {
      this.userId = data.userId;
      this.userColor = data.userColor;
      
      // Initialize drawing state with existing operations
      this.drawingState.clear();
      data.operations.forEach(op => this.drawingState.addOperation(op));
      
      if (this.onInit) {
        this.onInit(data);
      }
    });
    
    // User updates
    this.socket.on('users-update', (users) => {
      if (this.onUsersUpdate) {
        this.onUsersUpdate(users);
      }
    });
    
    // Drawing events from other users
    this.socket.on('draw-start', (data) => {
      if (this.onRemoteDrawStart) {
        this.onRemoteDrawStart(data);
      }
    });
    
    this.socket.on('draw-move', (data) => {
      if (this.onRemoteDrawMove) {
        this.onRemoteDrawMove(data);
      }
    });
    
    this.socket.on('draw-end', (data) => {
      if (this.onRemoteDrawEnd) {
        this.onRemoteDrawEnd(data);
      }
      // Add to local operations
      this.drawingState.addOperation(data);
    });
    
    // Cursor movement
    this.socket.on('cursor-move', (data) => {
      if (this.onRemoteCursor) {
        this.onRemoteCursor(data);
      }
    });
    
    // Undo operation
    this.socket.on('undo-operation', (data) => {
      this.drawingState.undo();
      if (this.onUndo) {
        this.onUndo(data);
      }
    });
    
    // Redo operation
    this.socket.on('redo-operation', (data) => {
      if (data.operation) {
        this.drawingState.addOperation(data.operation);
      }
      if (this.onRedo) {
        this.onRedo(data);
      }
    });
    
    // Clear canvas
    this.socket.on('clear-canvas', (data) => {
      this.drawingState.clear();
      if (this.onClear) {
        this.onClear(data);
      }
    });
  }
  
  handleConnectionError() {
    this.reconnectAttempts++;
    if (this.reconnectAttempts <= this.maxReconnectAttempts) {
      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`Reconnecting in ${delay}ms... (Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(), delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.updateConnectionStatus(false, 'Failed to connect to server');
    }
  }
  
  // Send drawing events
  sendDrawStart(data) {
    if (!this.connected) {
      console.warn('Not connected, cannot send draw start');
      return;
    }
    this.socket.emit('draw-start', data);
  }
  
  sendDrawMove(data) {
    if (!this.connected) {
      console.warn('Not connected, cannot send draw move');
      return;
    }
    this.socket.emit('draw-move', data);
  }
  
  sendDrawEnd(data) {
    if (!this.connected) {
      console.warn('Not connected, cannot send draw end');
      return;
    }
    this.socket.emit('draw-end', data);
    // Add to local operations
    this.drawingState.addOperation(data);
  }
  
  // Send cursor position
  sendCursorMove(data) {
    if (!this.connected) return;
    this.socket.emit('cursor-move', data);
  }
  
  // Send undo
  sendUndo() {
    if (!this.connected) return;
    if (this.drawingState.getOperationCount() === 0) return;
    this.socket.emit('undo');
  }
  
  // Send redo
  sendRedo() {
    if (!this.connected) return;
    this.socket.emit('redo');
  }
  
  // Send clear
  sendClear() {
    if (!this.connected) return;
    this.socket.emit('clear-canvas');
  }
  
  // Update connection status indicator
  updateConnectionStatus(connected, message = null) {
    const indicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
      indicator.classList.remove('disconnected');
      indicator.classList.add('connected');
      statusText.textContent = message || 'Connected - Ready to draw';
    } else {
      indicator.classList.remove('connected');
      indicator.classList.add('disconnected');
      statusText.textContent = message || 'Disconnected - Reconnecting...';
    }
  }
  
  getOperations() {
    return this.drawingState.getState();
  }
  
  // Cleanup method
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}