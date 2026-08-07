'use strict';

/**
 * Jira Automation Rules Engine
 */
async function checkAndApplyAutomationRules(task) {
  let modified = false;

  // Rule 1: Auto-complete task when all subtasks are finished
  if (task.subtasks && task.subtasks.length > 0 && task.status !== 'done') {
    const allDone = task.subtasks.every((s) => s.completed);
    if (allDone) {
      task.status = 'done';
      task.activityLog.push({
        action: 'automation_status_change',
        field: 'status',
        from: task.status,
        to: 'done',
        actor: 'Jira Automation Rule: Auto-close on Subtasks Done',
      });
      modified = true;
    }
  }

  if (modified) {
    await task.save();
  }

  return modified;
}

module.exports = { checkAndApplyAutomationRules };
