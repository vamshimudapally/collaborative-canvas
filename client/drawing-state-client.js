// drawing-state-client.js
class DrawingState {
  constructor() {
    this.operations = [];
    this.undoneOperations = [];
  }

  addOperation(op) {
    this.operations.push(op);
    this.undoneOperations = []; // clear redo stack
  }

  undo() {
    if (this.operations.length === 0) return null;
    const op = this.operations.pop();
    this.undoneOperations.push(op);
    return op;
  }

  redo() {
    if (this.undoneOperations.length === 0) return null;
    const op = this.undoneOperations.pop();
    this.operations.push(op);
    return op;
  }

  clear() {
    this.operations = [];
    this.undoneOperations = [];
  }

  getState() {
    return this.operations;
  }

  getOperationCount() {
    return this.operations.length;
  }
}
