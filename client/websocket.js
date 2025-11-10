class WebSocketManager {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.userId = null;
    this.userColor = null;
    this.operations = [];
  }
  
  connect() {
    // Connect to server
    this.socket = io();
    
    // Connection events
    this.socket.on('connect', () => {
      this.connected = true;
      this.updateConnectionStatus(true);
      console.log('Connected to server');
    });
    
    this.socket.on('disconnect', () => {
      this.connected = false;
      this.updateConnectionStatus(false);
      console.log('Disconnected from server');
    });
    
    // Initialize canvas
    this.socket.on('init-canvas', (data) => {
      this.userId = data.userId;
      this.userColor = data.userColor;
      this.operations = data.operations;
      
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
      this.operations.push(data);
    });
    
    // Cursor movement
    this.socket.on('cursor-move', (data) => {
      if (this.onRemoteCursor) {
        this.onRemoteCursor(data);
      }
    });
    
    // Undo operation
    this.socket.on('undo-operation', (data) => {
      if (this.onUndo) {
        this.onUndo(data);
      }
      // Remove last operation
      if (this.operations.length > 0) {
        this.operations.pop();
      }
    });
    
    // Redo operation
    this.socket.on('redo-operation', (data) => {
      if (this.onRedo) {
        this.onRedo(data);
      }
      // Add operation back
      if (data.operation) {
        this.operations.push(data.operation);
      }
    });
    
    // Clear canvas
    this.socket.on('clear-canvas', (data) => {
      if (this.onClear) {
        this.onClear(data);
      }
      this.operations = [];
    });
  }
  
  // Send drawing events
  sendDrawStart(data) {
    if (!this.connected) return;
    this.socket.emit('draw-start', data);
  }
  
  sendDrawMove(data) {
    if (!this.connected) return;
    this.socket.emit('draw-move', data);
  }
  
  sendDrawEnd(data) {
    if (!this.connected) return;
    this.socket.emit('draw-end', data);
    // Add to local operations
    this.operations.push(data);
  }
  
  // Send cursor position
  sendCursorMove(data) {
    if (!this.connected) return;
    this.socket.emit('cursor-move', data);
  }
  
  // Send undo
  sendUndo() {
    if (!this.connected) return;
    if (this.operations.length === 0) return;
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
  updateConnectionStatus(connected) {
    const indicator = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    
    if (connected) {
      indicator.classList.remove('disconnected');
      indicator.classList.add('connected');
      statusText.textContent = 'Connected - Ready to draw';
    } else {
      indicator.classList.remove('connected');
      indicator.classList.add('disconnected');
      statusText.textContent = 'Disconnected - Reconnecting...';
    }
  }
  
  getOperations() {
    return this.operations;
  }
}