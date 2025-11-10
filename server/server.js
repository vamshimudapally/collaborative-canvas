const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const RoomManager = require('./room');
const DrawingState = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// Initialize managers
const roomManager = new RoomManager();
const drawingState = new DrawingState();

// User color palette
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
let colorIndex = 0;

io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Assign user color
  const userColor = COLORS[colorIndex % COLORS.length];
  colorIndex++;
  
  // Add user to default room
  const roomId = 'default';
  roomManager.addUser(roomId, socket.id, userColor);
  socket.join(roomId);
  
  // Send current canvas state to new user
  const currentState = drawingState.getState(roomId);
  socket.emit('init-canvas', {
    operations: currentState,
    userId: socket.id,
    userColor: userColor
  });
  
  // Send updated user list to all users in room
  const users = roomManager.getUsers(roomId);
  io.to(roomId).emit('users-update', users);
  
  // Handle drawing events
  socket.on('draw-start', (data) => {
    socket.to(roomId).emit('draw-start', {
      ...data,
      userId: socket.id
    });
  });
  
  socket.on('draw-move', (data) => {
    socket.to(roomId).emit('draw-move', {
      ...data,
      userId: socket.id
    });
  });
  
  socket.on('draw-end', (data) => {
    // Save operation to history
    const operation = {
      ...data,
      userId: socket.id,
      timestamp: Date.now()
    };
    drawingState.addOperation(roomId, operation);
    
    // Broadcast to other users
    socket.to(roomId).emit('draw-end', {
      ...data,
      userId: socket.id
    });
  });
  
  // Handle cursor movement
  socket.on('cursor-move', (data) => {
    socket.to(roomId).emit('cursor-move', {
      x: data.x,
      y: data.y,
      userId: socket.id
    });
  });
  
  // Handle undo operation
  socket.on('undo', () => {
    const lastOp = drawingState.undo(roomId);
    if (lastOp) {
      // Broadcast undo to all users including sender
      io.to(roomId).emit('undo-operation', {
        operationId: lastOp.timestamp,
        userId: socket.id
      });
    }
  });
  
  // Handle redo operation
  socket.on('redo', () => {
    const redoOp = drawingState.redo(roomId);
    if (redoOp) {
      // Broadcast redo to all users including sender
      io.to(roomId).emit('redo-operation', {
        operation: redoOp,
        userId: socket.id
      });
    }
  });
  
  // Handle clear canvas
  socket.on('clear-canvas', () => {
    drawingState.clear(roomId);
    io.to(roomId).emit('clear-canvas', {
      userId: socket.id
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    roomManager.removeUser(roomId, socket.id);
    
    // Update user list
    const users = roomManager.getUsers(roomId);
    io.to(roomId).emit('users-update', users);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});