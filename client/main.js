// Initialize managers
const canvasManager = new CanvasManager('canvas');
const wsManager = new WebSocketManager();

// Current drawing state
let currentRemoteDrawings = new Map();

// Initialize application
function init() {
  setupUIHandlers();
  setupCanvasHandlers();
  setupWebSocketHandlers();
  wsManager.connect();
}

// Setup UI event handlers
function setupUIHandlers() {
  // Tool selection
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      const tool = btn.dataset.tool;
      canvasManager.setTool(tool);
      updateStatusText(`Tool: ${tool}`);
    });
  });
  
  // Color picker
  const colorPicker = document.getElementById('colorPicker');
  const colorDisplay = document.getElementById('colorDisplay');
  
  colorPicker.addEventListener('input', (e) => {
    const color = e.target.value;
    canvasManager.setColor(color);
    colorDisplay.style.background = color;
    updateStatusText(`Color: ${color}`);
  });
  
  // Preset colors
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      canvasManager.setColor(color);
      colorPicker.value = color;
      colorDisplay.style.background = color;
      updateStatusText(`Color: ${color}`);
    });
  });
  
  // Stroke width
  const strokeWidth = document.getElementById('strokeWidth');
  const strokeValue = document.getElementById('strokeValue');
  
  strokeWidth.addEventListener('input', (e) => {
    const width = parseInt(e.target.value);
    canvasManager.setStrokeWidth(width);
    strokeValue.textContent = width;
  });
  
  // Undo button
  document.getElementById('undoBtn').addEventListener('click', () => {
    wsManager.sendUndo();
  });
  
  // Redo button
  document.getElementById('redoBtn').addEventListener('click', () => {
    wsManager.sendRedo();
  });
  
  // Clear button
  document.getElementById('clearBtn').addEventListener('click', () => {
    if (confirm('Clear the entire canvas? This will affect all users.')) {
      wsManager.sendClear();
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault();
      wsManager.sendUndo();
    }
    if (e.ctrlKey && e.key === 'y') {
      e.preventDefault();
      wsManager.sendRedo();
    }
  });
}

// Setup canvas event handlers
function setupCanvasHandlers() {
  // Drawing start
  canvasManager.onDrawStart = (data) => {
    wsManager.sendDrawStart(data);
  };
  
  // Drawing move
  canvasManager.onDrawMove = (data) => {
    wsManager.sendDrawMove(data);
  };
  
  // Drawing end
  canvasManager.onDrawEnd = (data) => {
    wsManager.sendDrawEnd(data);
  };
  
  // Cursor move (throttled)
  let lastCursorSend = 0;
  canvasManager.onCursorMove = (coords) => {
    const now = Date.now();
    if (now - lastCursorSend > 50) { // Throttle to 20fps
      wsManager.sendCursorMove(coords);
      lastCursorSend = now;
    }
  };
}

// Setup WebSocket event handlers
function setupWebSocketHandlers() {
  // Initialize canvas with existing operations
  wsManager.onInit = (data) => {
    console.log('Canvas initialized. User:', data.userId);
    
    // Redraw existing operations
    if (data.operations.length > 0) {
      canvasManager.redrawFromOperations(data.operations);
    }
    
    updateStatusText('Connected - Start drawing!');
  };
  
  // Users update
  wsManager.onUsersUpdate = (users) => {
    updateUsersList(users);
  };
  
  // Remote drawing start
  wsManager.onRemoteDrawStart = (data) => {
    currentRemoteDrawings.set(data.userId, {
      tool: data.tool,
      color: data.color,
      width: data.width,
      path: [{ x: data.x, y: data.y }]
    });
  };
  
  // Remote drawing move
  wsManager.onRemoteDrawMove = (data) => {
    const drawing = currentRemoteDrawings.get(data.userId);
    if (drawing) {
      drawing.path.push({ x: data.x, y: data.y });
      
      // Draw line segment for immediate feedback
      if (drawing.tool === 'pen' || drawing.tool === 'eraser') {
        const path = drawing.path;
        const from = path[path.length - 2];
        const to = path[path.length - 1];
        const color = drawing.tool === 'eraser' ? '#FFFFFF' : drawing.color;
        canvasManager.drawLine(from, to, color, drawing.width);
      }
    }
  };
  
  // Remote drawing end
  wsManager.onRemoteDrawEnd = (data) => {
    canvasManager.drawRemoteOperation(data);
    currentRemoteDrawings.delete(data.userId);
  };
  
  // Remote cursor
  wsManager.onRemoteCursor = (data) => {
    // Get user color from users list
    const usersList = document.getElementById('usersList');
    const userIndicator = usersList.querySelector(`[data-user-id="${data.userId}"]`);
    const color = userIndicator ? userIndicator.style.backgroundColor : '#999';
    
    canvasManager.updateRemoteCursor(data.userId, data.x, data.y, color);
  };
  
  // Undo operation
  wsManager.onUndo = (data) => {
    // Redraw canvas from operations
    const operations = wsManager.getOperations();
    canvasManager.redrawFromOperations(operations);
    updateStatusText('Undo performed');
  };
  
  // Redo operation
  wsManager.onRedo = (data) => {
    // Redraw canvas from operations
    const operations = wsManager.getOperations();
    canvasManager.redrawFromOperations(operations);
    updateStatusText('Redo performed');
  };
  
  // Clear canvas
  wsManager.onClear = (data) => {
    canvasManager.clear();
    updateStatusText('Canvas cleared');
  };
}

// Update users list UI
function updateUsersList(users) {
  const usersList = document.getElementById('usersList');
  usersList.innerHTML = '';
  
  users.forEach(user => {
    const indicator = document.createElement('div');
    indicator.className = 'user-indicator';
    indicator.style.backgroundColor = user.color;
    indicator.dataset.userId = user.id;
    indicator.textContent = user.id.substring(0, 2).toUpperCase();
    indicator.title = `User ${user.id}`;
    
    // Mark current user
    if (user.id === wsManager.userId) {
      indicator.classList.add('self');
      indicator.title += ' (You)';
    }
    
    usersList.appendChild(indicator);
  });
}

// Update status text
function updateStatusText(text) {
  const statusText = document.getElementById('statusText');
  statusText.textContent = text;
  
  // Reset after 3 seconds
  setTimeout(() => {
    if (statusText.textContent === text) {
      statusText.textContent = 'Ready to draw';
    }
  }, 3000);
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}