class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  
  // Add user to room
  addUser(roomId, userId, userColor) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    
    const room = this.rooms.get(roomId);
    room.set(userId, {
      id: userId,
      color: userColor,
      joinedAt: Date.now()
    });
    
    console.log(`User ${userId} joined room ${roomId}`);
  }
  
  // Remove user from room
  removeUser(roomId, userId) {
    if (!this.rooms.has(roomId)) return;
    
    const room = this.rooms.get(roomId);
    room.delete(userId);
    
    // Clean up empty rooms
    if (room.size === 0) {
      this.rooms.delete(roomId);
    }
    
    console.log(`User ${userId} left room ${roomId}`);
  }
  
  // Get all users in room
  getUsers(roomId) {
    if (!this.rooms.has(roomId)) {
      return [];
    }
    
    const room = this.rooms.get(roomId);
    return Array.from(room.values());
  }
  
  // Get user info
  getUser(roomId, userId) {
    if (!this.rooms.has(roomId)) return null;
    
    const room = this.rooms.get(roomId);
    return room.get(userId) || null;
  }
  
  // Get room count
  getRoomCount() {
    return this.rooms.size;
  }
  
  // Get total user count
  getTotalUsers() {
    let count = 0;
    for (const room of this.rooms.values()) {
      count += room.size;
    }
    return count;
  }
}

module.exports = RoomManager;