// Manages the drawing canvas and all drawing operations
class CanvasManager {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    
    // What we're currently drawing with
    this.tool = 'pen';
    this.color = '#000000';
    this.brushSize = 5;
    
    // Keep track of whether we're actively drawing
    this.drawing = false;
    
    // Store the path of points as we draw
    this.currentPath = [];
    this.startPos = null;
    
    // For shape tools, we need a preview canvas
    this.previewCanvas = document.createElement('canvas');
    this.previewCtx = this.previewCanvas.getContext('2d');
    
    // Track other users' cursors
    this.cursors = new Map();
    
    this.setup();
    this.attachListeners();
  }
  
  setup() {
    this.resize();
    
    // Make sure canvas resizes when window does
    window.addEventListener('resize', () => this.resize());
    
    // Smooth lines look better
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.previewCtx.lineCap = 'round';
    this.previewCtx.lineJoin = 'round';
  }
  
  resize() {
    const container = this.canvas.parentElement;
    const bounds = container.getBoundingClientRect();
    
    // Save what's currently drawn before resizing
    const saved = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    
    this.canvas.width = bounds.width;
    this.canvas.height = bounds.height;
    this.previewCanvas.width = bounds.width;
    this.previewCanvas.height = bounds.height;
    
    // Put the drawing back
    this.ctx.putImageData(saved, 0, 0);
    
    // Reapply line style settings
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.previewCtx.lineCap = 'round';
    this.previewCtx.lineJoin = 'round';
  }
  
  attachListeners() {
    // Mouse events for desktop
    this.canvas.addEventListener('mousedown', e => this.startDrawing(e));
    this.canvas.addEventListener('mousemove', e => this.keepDrawing(e));
    this.canvas.addEventListener('mouseup', e => this.stopDrawing(e));
    this.canvas.addEventListener('mouseleave', e => this.stopDrawing(e));
    
    // Touch events for mobile
    this.canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      this.startDrawing(e.touches[0]);
    }, { passive: false });
    
    this.canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      this.keepDrawing(e.touches[0]);
    }, { passive: false });
    
    this.canvas.addEventListener('touchend', e => {
      e.preventDefault();
      this.stopDrawing(e);
    }, { passive: false });
  }
  
  // Convert mouse/touch position to canvas coordinates
  getPos(event) {
    const bounds = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top
    };
  }
  
  startDrawing(event) {
    this.drawing = true;
    const pos = this.getPos(event);
    this.startPos = pos;
    this.currentPath = [pos];
    
    // For shapes, we need to save the current canvas
    // so we can show a preview without messing up what's already drawn
    if (this.tool !== 'pen' && this.tool !== 'eraser') {
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      this.previewCtx.drawImage(this.canvas, 0, 0);
    }
    
    // Tell the network manager we started drawing
    if (this.onDrawStart) {
      this.onDrawStart({
        tool: this.tool,
        color: this.color,
        width: this.brushSize,
        x: pos.x,
        y: pos.y
      });
    }
  }
  
  keepDrawing(event) {
    const pos = this.getPos(event);
    
    // Always send cursor position for collaboration
    if (this.onCursorMove) {
      this.onCursorMove(pos);
    }
    
    if (!this.drawing) return;
    
    this.currentPath.push(pos);
    
    // Draw immediately for pen and eraser (feels more responsive)
    if (this.tool === 'pen' || this.tool === 'eraser') {
      const prev = this.currentPath[this.currentPath.length - 2];
      const drawColor = this.tool === 'eraser' ? '#FFFFFF' : this.color;
      this.drawLine(prev, pos, drawColor, this.brushSize);
    } else {
      // Show live preview for shapes
      this.showPreview(pos);
    }
    
    // Tell network about the movement
    if (this.onDrawMove) {
      this.onDrawMove({ x: pos.x, y: pos.y });
    }
  }
  
  showPreview(currentPos) {
    // Clear canvas and restore original
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.previewCanvas, 0, 0);
    
    // Draw the preview shape
    this.drawShape(this.tool, this.startPos, currentPos, this.color, this.brushSize);
  }
  
  stopDrawing(event) {
    if (!this.drawing) return;
    this.drawing = false;
    
    // For shapes, finalize the drawing
    if (this.tool !== 'pen' && this.tool !== 'eraser' && this.startPos) {
      const endPos = this.currentPath[this.currentPath.length - 1];
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.previewCanvas, 0, 0);
      this.drawShape(this.tool, this.startPos, endPos, this.color, this.brushSize);
    }
    
    // Send final drawing data
    if (this.onDrawEnd) {
      this.onDrawEnd({
        tool: this.tool,
        color: this.color,
        width: this.brushSize,
        path: this.currentPath
      });
    }
    
    // Reset for next drawing
    this.currentPath = [];
    this.startPos = null;
  }
  
  // Draw a line between two points
  drawLine(from, to, color, width) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(from.x, from.y);
    this.ctx.lineTo(to.x, to.y);
    this.ctx.stroke();
  }
  
  // Draw a complete path (series of connected lines)
  drawPath(points, color, width) {
    if (points.length < 2) return;
    
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    
    this.ctx.stroke();
  }
  
  // Draw geometric shapes
  drawShape(type, start, end, color, width) {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    
    if (type === 'circle') {
      // Calculate radius from start to end point
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      this.ctx.arc(start.x, start.y, radius, 0, Math.PI * 2);
    } 
    else if (type === 'rectangle') {
      const w = end.x - start.x;
      const h = end.y - start.y;
      this.ctx.rect(start.x, start.y, w, h);
    } 
    else if (type === 'line') {
      this.ctx.moveTo(start.x, start.y);
      this.ctx.lineTo(end.x, end.y);
    }
    
    this.ctx.stroke();
  }
  
  // Draw what another user did
  drawRemote(operation) {
    const { tool, color, width, path } = operation;
    
    if (tool === 'pen' || tool === 'eraser') {
      const drawColor = tool === 'eraser' ? '#FFFFFF' : color;
      this.drawPath(path, drawColor, width);
    } else {
      const start = path[0];
      const end = path[path.length - 1];
      this.drawShape(tool, start, end, color, width);
    }
  }
  
  // Wipe everything
  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
  
  // Redraw canvas from history
  redraw(operations) {
    this.clear();
    operations.forEach(op => this.drawRemote(op));
  }
  
  // Show where other users are pointing
  updateCursor(userId, x, y, color) {
    let cursor = this.cursors.get(userId);
    
    if (!cursor) {
      cursor = this.createCursor(userId, color);
      this.cursors.set(userId, cursor);
    }
    
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    cursor.style.display = 'block';
    
    // Hide cursor if user is idle (helps with performance)
    clearTimeout(cursor.hideTimer);
    cursor.hideTimer = setTimeout(() => {
      cursor.style.display = 'none';
    }, 3000);
  }
  
  createCursor(userId, color) {
    const layer = document.getElementById('cursors');
    const cursor = document.createElement('div');
    cursor.className = 'remote-cursor';
    cursor.style.backgroundColor = color;
    cursor.style.display = 'none';
    
    const label = document.createElement('div');
    label.className = 'cursor-label';
    label.textContent = 'User ' + userId.slice(0, 4);
    cursor.appendChild(label);
    
    layer.appendChild(cursor);
    return cursor;
  }
  
  removeCursor(userId) {
    const cursor = this.cursors.get(userId);
    if (cursor) {
      clearTimeout(cursor.hideTimer);
      cursor.remove();
      this.cursors.delete(userId);
    }
  }
  
  // Update drawing settings
  setTool(tool) { this.tool = tool; }
  setColor(color) { this.color = color; }
  setStrokeWidth(width) { this.brushSize = width; }
}