class DrawingState {
  constructor() {
    this.rooms = new Map();
  }
  
  // Initialize room if doesn't exist
  initRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        operations: [],
        undoneOperations: []
      });
    }
  }
  
  // Add drawing operation
  addOperation(roomId, operation) {
    this.initRoom(roomId);
    const room = this.rooms.get(roomId);
    
    room.operations.push(operation);
    // Clear redo stack when new operation is added
    room.undoneOperations = [];
    
    console.log(`Operation added to room ${roomId}. Total: ${room.operations.length}`);
  }
  
  // Undo last operation
  undo(roomId) {
    this.initRoom(roomId);
    const room = this.rooms.get(roomId);
    
    if (room.operations.length === 0) {
      return null;
    }
    
    const lastOp = room.operations.pop();
    room.undoneOperations.push(lastOp);
    
    console.log(`Undo in room ${roomId}. Remaining: ${room.operations.length}`);
    return lastOp;
  }
  
  // Redo last undone operation
  redo(roomId) {
    this.initRoom(roomId);
    const room = this.rooms.get(roomId);
    
    if (room.undoneOperations.length === 0) {
      return null;
    }
    
    const op = room.undoneOperations.pop();
    room.operations.push(op);
    
    console.log(`Redo in room ${roomId}. Total: ${room.operations.length}`);
    return op;
  }
  
  // Get all operations
  getState(roomId) {
    this.initRoom(roomId);
    const room = this.rooms.get(roomId);
    return room.operations;
  }
  
  // Clear all operations
  clear(roomId) {
    this.initRoom(roomId);
    const room = this.rooms.get(roomId);
    room.operations = [];
    room.undoneOperations = [];
    
    console.log(`Cleared room ${roomId}`);
  }
  
  // Get operation count
  getOperationCount(roomId) {
    this.initRoom(roomId);
    const room = this.rooms.get(roomId);
    return room.operations.length;
  }
}

module.exports = DrawingState;