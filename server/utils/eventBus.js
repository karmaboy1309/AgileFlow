// ─── server/utils/eventBus.js ────────────────────────────────────────────────
// Simple in-process event bus for decoupled communication between route handlers.
// Supports wildcard events, one-time listeners, and error isolation.
// In production, this can be swapped for Redis pub/sub or a message queue.

'use strict';

const EventEmitter = require('events');

class AgileFlowEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
    // Track listener counts for debugging
    this._listenerStats = {};
  }

  /**
   * Emit a typed domain event with structured payload
   * @param {string} eventName - e.g. 'task.status_changed'
   * @param {object} payload   - { entityType, entityId, actorId, data, timestamp }
   */
  publish(eventName, payload = {}) {
    const event = {
      eventName,
      timestamp: new Date().toISOString(),
      ...payload,
    };

    // Emit both specific and wildcard listeners
    try {
      this.emit(eventName, event);
      this.emit('*', event);
    } catch (err) {
      console.error(`[EventBus] Error handling event "${eventName}":`, err.message);
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[EventBus] 📨 ${eventName}`, payload.entityId ? `(${payload.entityType}:${payload.entityId})` : '');
    }

    return event;
  }

  /**
   * Subscribe with automatic error handling wrapper
   */
  subscribe(eventName, handler) {
    const wrapped = async (...args) => {
      try { await handler(...args); } catch (err) { console.error(`[EventBus] Handler error for "${eventName}":`, err.message); }
    };
    this.on(eventName, wrapped);
    return () => this.off(eventName, wrapped); // returns unsubscribe function
  }

  /**
   * Subscribe to all events (wildcard)
   */
  subscribeAll(handler) {
    return this.subscribe('*', handler);
  }
}

const eventBus = new AgileFlowEventBus();

// ── Domain event constants ────────────────────────────────────────────────────
eventBus.EVENTS = Object.freeze({
  TASK_CREATED:         'task.created',
  TASK_UPDATED:         'task.updated',
  TASK_DELETED:         'task.deleted',
  TASK_STATUS_CHANGED:  'task.status_changed',
  TASK_ASSIGNED:        'task.assigned',
  EPIC_CREATED:         'epic.created',
  EPIC_COMPLETED:       'epic.completed',
  SPRINT_STARTED:       'sprint.started',
  SPRINT_COMPLETED:     'sprint.completed',
  COMMENT_ADDED:        'comment.added',
  WORKLOG_ADDED:        'worklog.added',
  RELEASE_PUBLISHED:    'release.published',
  PROJECT_UPDATED:      'project.updated',
  INTEGRATION_TRIGGER:  'integration.trigger',
});

module.exports = eventBus;
