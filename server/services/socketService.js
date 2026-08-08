'use strict';

// Simulated WebSocket sync service to notify active project boards of updates
class WebSocketSyncService {
  constructor() {
    this.connections = new Set();
  }

  registerConnection(socket) {
    this.connections.add(socket);
  }

  removeConnection(socket) {
    this.connections.delete(socket);
  }

  broadcast(event, payload) {
    console.log(`🔌 [WS Broadcast] Event: ${event}, clients: ${this.connections.size}`);
    // Emit logic here
  }
}

module.exports = new WebSocketSyncService();
