'use strict';

const EventEmitter = require('events');
const Notification = require('../models/Notification');
const User = require('../models/User');

class JiraNotificationEmitter extends EventEmitter {}
const notificationEmitter = new JiraNotificationEmitter();

// Handle ISSUE_ASSIGNED event
notificationEmitter.on('ISSUE_ASSIGNED', async ({ task, assigneeName, actorId, actorName }) => {
  try {
    const assignedUser = await User.findOne({
      $or: [{ name: new RegExp(assigneeName, 'i') }, { email: new RegExp(assigneeName, 'i') }],
    });

    if (assignedUser && assignedUser._id.toString() !== actorId.toString()) {
      await Notification.create({
        recipient: assignedUser._id,
        sender: actorId,
        type: 'assigned',
        taskId: task._id,
        message: `${actorName} assigned you to issue ${task.issueKey || task.title}`,
      });
      console.log(`📩  [Notification] Dispatched assignment notification to ${assignedUser.email}`);
    }
  } catch (err) {
    console.error('❗ Notification dispatch error:', err.message);
  }
});

// Handle ISSUE_STATUS_CHANGED event
notificationEmitter.on('ISSUE_STATUS_CHANGED', async ({ task, oldStatus, newStatus, actorId, actorName }) => {
  try {
    if (!task.assignee) return;
    const assignedUser = await User.findOne({
      $or: [{ name: new RegExp(task.assignee, 'i') }, { email: new RegExp(task.assignee, 'i') }],
    });

    if (assignedUser && assignedUser._id.toString() !== actorId.toString()) {
      await Notification.create({
        recipient: assignedUser._id,
        sender: actorId,
        type: 'status_change',
        taskId: task._id,
        message: `${actorName} moved issue ${task.issueKey || task.title} from ${oldStatus} to ${newStatus}`,
      });
    }
  } catch (err) {
    console.error('❗ Notification dispatch error:', err.message);
  }
});

module.exports = notificationEmitter;
