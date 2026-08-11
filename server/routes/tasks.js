'use strict';

/**
 * routes/tasks.js
 *
 * All Task endpoints require a valid JWT (enforced by the `protect` middleware).
 * Tasks are always scoped through their parent Epic to verify ownership.
 *
 * GET    /api/tasks?epicId=:id  — List all tasks for an Epic (sorted by orderIndex)
 * POST   /api/tasks             — Create a new task inside an Epic
 * PUT    /api/tasks/:id         — Update status / orderIndex / any field (DnD + edits)
 * DELETE /api/tasks/:id         — Remove a single task
 */

const express  = require('express');
const mongoose = require('mongoose');
const protect  = require('../middleware/auth');
const Task         = require('../models/Task');
const Epic         = require('../models/Epic');
const Project      = require('../models/Project');
const User         = require('../models/User');
const Notification = require('../models/Notification');

const router = express.Router();

// All routes below this line require authentication
router.use(protect);

// ─── Helper: Validate MongoDB ObjectId ───────────────────────────────────────
const isValidId = (id) => mongoose.isValidObjectId(id);

// Helper to validate dynamic custom fields values against project definitions
async function validateCustomFields(projectId, customFieldsData, userId) {
  if (!customFieldsData || typeof customFieldsData !== 'object') {
    return { valid: true, data: {} };
  }

  const project = await Project.findOne({ _id: projectId, createdBy: userId });
  if (!project) {
    return { valid: false, message: 'Project not found.' };
  }

  const definitions = project.customFields || [];
  const defMap = {};
  definitions.forEach(d => {
    defMap[d.name] = d;
  });

  const validatedData = {};

  for (const [key, value] of Object.entries(customFieldsData)) {
    const definition = defMap[key];
    if (!definition) {
      return { valid: false, message: `Custom field "${key}" is not defined for this project.` };
    }

    if (value === null || value === undefined || value === '') {
      validatedData[key] = null;
      continue;
    }

    if (definition.fieldType === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, message: `Value for custom field "${key}" must be a number.` };
      }
      validatedData[key] = num;
    } else if (definition.fieldType === 'date') {
      const ms = Date.parse(value);
      if (isNaN(ms)) {
        return { valid: false, message: `Value for custom field "${key}" must be a valid date string.` };
      }
      validatedData[key] = new Date(value);
    } else if (definition.fieldType === 'select') {
      const valStr = String(value).trim();
      if (!definition.options.includes(valStr)) {
        return { valid: false, message: `Value "${valStr}" for custom field "${key}" must be one of: ${definition.options.join(', ')}.` };
      }
      validatedData[key] = valStr;
    } else {
      validatedData[key] = String(value).trim();
    }
  }

  return { valid: true, data: validatedData };
}

/**
 * Verify that the calling user owns the Epic referenced by epicId.
 * Returns the Epic document on success, or throws a 404 response.
 */
const assertEpicOwnership = async (epicId, userId, res) => {
  if (!isValidId(epicId)) {
    res.status(400).json({ message: 'Invalid Epic ID format.' });
    return null;
  }
  const epic = await Epic.findOne({ _id: epicId, createdBy: userId });
  if (!epic) {
    res.status(404).json({ message: 'Epic not found or access denied.' });
    return null;
  }
  return epic;
};

// ─── GET /api/tasks?epicId=:id ────────────────────────────────────────────────
/**
 * Returns all tasks for the specified Epic, sorted by orderIndex ascending.
 * This is the primary endpoint called by the frontend KanbanBoard.
 */
router.get('/', async (req, res, next) => {
  try {
    const { epicId, limit: limitStr, skip: skipStr, status } = req.query;

    if (!epicId) {
      return res.status(400).json({ message: 'Query parameter "epicId" is required.' });
    }

    // Ownership check
    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;   // Response already sent inside assertEpicOwnership

    // Pagination — default 50 tasks per page, cap at 200
    const limit = Math.min(parseInt(limitStr, 10) || 50, 200);
    const skip  = parseInt(skipStr, 10)  || 0;

    // Optional status filter for column-level lazy loading
    const filter = { epicId };
    if (status) filter.status = status;

    const [tasks, totalCount] = await Promise.all([
      Task.find(filter)
        .populate('epicId', 'title color status')
        .sort({ orderIndex: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit),
      Task.countDocuments(filter),
    ]);

    const hasMore = skip + tasks.length < totalCount;

    console.log(`📋  [tasks] GET /?epicId=${epicId} — ${tasks.length} of ${totalCount} task(s) (skip=${skip}, limit=${limit})`);
    res.json({ tasks, totalCount, hasMore });
  } catch (error) {
    console.error('❗  [tasks/GET /]', error.message);
    next(error);
  }
});

// GET /api/tasks/export/csv - Download issues as CSV
router.get('/export/csv', async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const filter = {};
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter);
    
    let csv = 'Issue Key,Title,Type,Status,Priority,Assignee,Story Points\n';
    tasks.forEach(t => {
      csv += `"${t.issueKey || ''}","${(t.title || '').replace(/"/g, '""')}","${t.issueType}","${t.status}","${t.priority}","${t.assignee || ''}",${t.storyPoints || 0}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="agileflow_issues_export.csv"');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
});

// Helper to parse RFC 4180 compliant CSV strings
function parseCSV(text) {
  const p = [[]];
  let quote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const next = text[i+1];
    if (c === '"') {
      if (quote && next === '"') { p[p.length - 1][p[p.length - 1].length - 1] += '"'; i++; }
      else { quote = !quote; }
    } else if (c === ',') {
      if (quote) { p[p.length - 1][p[p.length - 1].length - 1] += c; }
      else { p[p.length - 1].push(''); }
    } else if (c === '\n' || c === '\r') {
      if (quote) { p[p.length - 1][p[p.length - 1].length - 1] += c; }
      else if (c === '\n' || (c === '\r' && next !== '\n')) { p.push(['']); }
    } else {
      if (p[p.length - 1].length === 0) { p[p.length - 1].push(''); }
      p[p.length - 1][p[p.length - 1].length - 1] += c;
    }
  }
  return p.filter(row => row.length > 0 && row.some(cell => cell.trim().length > 0));
}

// POST /api/tasks/import/csv - Bulk import tasks from CSV
router.post('/import/csv', async (req, res, next) => {
  try {
    const { csvData, epicId, projectId } = req.body;
    if (!csvData) {
      return res.status(400).json({ message: 'csvData is required.' });
    }
    if (!epicId || !projectId) {
      return res.status(400).json({ message: 'epicId and projectId are required.' });
    }

    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;

    const project = await Project.findOne({ _id: projectId, createdBy: req.user.id });
    if (!project) {
      return res.status(404).json({ message: 'Project not found.' });
    }

    const rows = parseCSV(csvData);
    if (rows.length === 0) {
      return res.status(400).json({ message: 'No valid rows found in CSV.' });
    }

    let startIdx = 0;
    const firstRowHeaderCheck = rows[0][0].toLowerCase().trim();
    if (firstRowHeaderCheck === 'title' || firstRowHeaderCheck === 'issue key' || firstRowHeaderCheck === 'issuekey') {
      startIdx = 1;
    }

    let successCount = 0;
    let errorCount = 0;
    const importedTasks = [];
    const importErrors = [];

    let currentOrderIndex = await Task.countDocuments({ epicId });

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      const title = row[0]?.trim();
      if (!title) {
        importErrors.push({ row: i + 1, message: 'Missing Title in CSV column 1.' });
        errorCount++;
        continue;
      }

      const issueType = row[1]?.trim().toLowerCase() || 'task';
      const status = row[2]?.trim().toLowerCase() || 'todo';
      const priority = row[3]?.trim().toLowerCase() || 'medium';
      const assignee = row[4]?.trim() || '';
      const storyPoints = parseInt(row[5]?.trim(), 10) || 0;
      const description = row[6]?.trim() || '';

      try {
        const updatedProject = await Project.findByIdAndUpdate(
          project._id,
          { $inc: { seq: 1 } },
          { new: true }
        );

        const generatedKey = `${updatedProject.key}-${updatedProject.seq}`;

        const task = await Task.create({
          title,
          description,
          issueType,
          issueKey: generatedKey,
          projectId: project._id,
          status,
          priority,
          assignee,
          storyPoints,
          epicId,
          orderIndex: currentOrderIndex++,
        });

        importedTasks.push(task);
        successCount++;
      } catch (err) {
        importErrors.push({ row: i + 1, message: err.message });
        errorCount++;
      }
    }

    res.status(201).json({
      message: `Import complete. ${successCount} tasks imported, ${errorCount} failed.`,
      successCount,
      errorCount,
      errors: importErrors,
      tasks: importedTasks,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/tasks ──────────────────────────────────────────────────────────
/**
 * Body: { epicId, title, description?, status?, priority?, assignee?, orderIndex? }
 * Returns: { task }
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      epicId,
      projectId: reqProjectId,
      issueType   = 'task',
      title,
      description = '',
      status      = 'todo',
      priority    = 'medium',
      assignee    = '',
      orderIndex,
      dueDate,
      subtasks,
      tags,
      attachments,
      estimatedHours = 0,
      loggedHours    = 0,
      storyPoints    = 0,
      sprintId       = null,
      customFieldsData = {},
    } = req.body;

    if (!epicId || !title) {
      return res.status(400).json({ message: 'epicId and title are required.' });
    }

    // Ownership check
    const epic = await assertEpicOwnership(epicId, req.user.id, res);
    if (!epic) return;

    // Determine associated Project or default project for key generation
    let targetProject = null;
    if (reqProjectId) {
      targetProject = await Project.findOne({ _id: reqProjectId, createdBy: req.user.id });
    }
    if (!targetProject) {
      // Find default project or create default 'AGILE' project for user
      targetProject = await Project.findOne({ createdBy: req.user.id });
      if (!targetProject) {
        targetProject = await Project.create({
          name: 'AgileFlow Default',
          key: 'AGILE',
          createdBy: req.user.id,
          lead: req.user.id,
        });
      }
    }

    // Atomically increment project sequence counter
    const updatedProject = await Project.findByIdAndUpdate(
      targetProject._id,
      { $inc: { seq: 1 } },
      { new: true }
    );

    const generatedKey = `${updatedProject.key}-${updatedProject.seq}`;

    // Auto-assign orderIndex = current task count if not provided
    let idx = orderIndex;
    if (idx === undefined || idx === null) {
      idx = await Task.countDocuments({ epicId });
    }

    const { valid: cfValid, data: cfData, message: cfError } = await validateCustomFields(
      updatedProject._id,
      customFieldsData,
      req.user.id
    );
    if (!cfValid) {
      return res.status(400).json({ message: cfError });
    }

    const task = await Task.create({
      title          : title.trim(),
      description    : description.trim(),
      issueType      : issueType || 'task',
      issueKey       : generatedKey,
      projectId      : updatedProject._id,
      sprintId       : sprintId || null,
      status,
      priority,
      assignee       : assignee.trim(),
      epicId,
      orderIndex     : idx,
      dueDate        : dueDate ? new Date(dueDate) : null,
      subtasks       : Array.isArray(subtasks) ? subtasks : [],
      tags           : Array.isArray(tags) ? tags : [],
      attachments    : Array.isArray(attachments) ? attachments : [],
      estimatedHours : Number(estimatedHours) || 0,
      loggedHours    : Number(loggedHours) || 0,
      storyPoints    : Number(storyPoints) || 0,
      customFieldsData: cfData,
      activityLog    : [{
        action: 'created',
        actor : req.user.name || req.user.email,
      }],
    });

    console.log(`✅  [tasks] Created: "${task.title}" (${task._id}) in epic ${epicId}`);
    res.status(201).json({ task });
  } catch (error) {
    console.error('❗  [tasks/POST /]', error.message);
    next(error);
  }
});

// ─── PUT /api/tasks/:id ───────────────────────────────────────────────────────
/**
 * Primary use-case: drag-and-drop → sends { status, orderIndex }.
 * Also handles full updates: { title, description, priority, assignee }.
 *
 * Ownership is verified by tracing task → epic → createdBy.
 *
 * Returns: { task }
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Task ID format.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Verify ownership via the parent Epic
    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) {
      return res.status(403).json({ message: 'Access denied. You do not own this task.' });
    }

    // ── Build update payload — only touch fields that were sent ──────────────
    const {
      title,
      description,
      issueType,
      status,
      priority,
      assignee,
      orderIndex,
      dueDate,
      subtasks,
      tags,
      attachments,
      isArchived,
      estimatedHours,
      loggedHours,
      storyPoints,
      sprintId,
      customFieldsData,
    } = req.body;

    const updates = {};

    if (customFieldsData !== undefined) {
      const { valid: cfValid, data: cfData, message: cfError } = await validateCustomFields(
        task.projectId,
        customFieldsData,
        req.user.id
      );
      if (!cfValid) {
        return res.status(400).json({ message: cfError });
      }
      updates.customFieldsData = cfData;
    }

    if (title          !== undefined) updates.title          = title.trim();
    if (description    !== undefined) updates.description    = description.trim();
    if (issueType      !== undefined) updates.issueType      = issueType;
    if (status         !== undefined) {
      // Workflow State Transition Guard: Validate allowed transitions
      const validStatuses = ['todo', 'in-progress', 'done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status transition: "${status}". Must be one of ${validStatuses.join(', ')}` });
      }
      updates.status = status;
    }
    if (priority       !== undefined) updates.priority       = priority;
    if (assignee       !== undefined) updates.assignee       = assignee.trim();
    if (orderIndex     !== undefined) updates.orderIndex     = Number(orderIndex);
    if (dueDate        !== undefined) updates.dueDate        = dueDate ? new Date(dueDate) : null;
    if (subtasks       !== undefined) updates.subtasks       = Array.isArray(subtasks) ? subtasks : [];
    if (tags           !== undefined) updates.tags           = Array.isArray(tags) ? tags : [];
    if (attachments    !== undefined) updates.attachments    = Array.isArray(attachments) ? attachments : [];
    if (isArchived     !== undefined) updates.isArchived     = Boolean(isArchived);
    if (estimatedHours !== undefined) updates.estimatedHours = Number(estimatedHours) || 0;
    if (loggedHours    !== undefined) updates.loggedHours    = Number(loggedHours) || 0;
    if (storyPoints    !== undefined) updates.storyPoints    = Number(storyPoints) || 0;
    if (sprintId       !== undefined) updates.sprintId       = sprintId || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No update fields provided.' });
    }

    // ── Build activity log entries for auditable field changes ────────────────
    const actorName = req.user.name || req.user.email;
    const newLogEntries = [];
    const auditableFields = ['status', 'priority', 'assignee', 'isArchived', 'storyPoints', 'issueType', 'sprintId'];
    for (const field of auditableFields) {
      if (updates[field] !== undefined && String(task[field]) !== String(updates[field])) {
        newLogEntries.push({
          action   : `${field}_change`,
          field,
          from     : String(task[field] ?? ''),
          to       : String(updates[field]),
          actor    : actorName,
          createdAt: new Date(),
        });
      }
    }

    // Use $set for data updates and $push to append log entries atomically
    const mongoUpdate = { $set: updates };
    if (newLogEntries.length > 0) {
      mongoUpdate.$push = { activityLog: { $each: newLogEntries } };
    }

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      mongoUpdate,
      { new: true, runValidators: true }
    );

    console.log(
      `✏️   [tasks] Updated: "${updatedTask.title}" (${id}) → status="${updatedTask.status}", order=${updatedTask.orderIndex}`
    );

    res.json({ task: updatedTask });
  } catch (error) {
    console.error(`❗  [tasks/PUT /:id]`, error.message);
    next(error);
  }
});

// ─── DELETE /api/tasks/:id ────────────────────────────────────────────────────
/**
 * Removes a single task. Ownership verified via parent Epic.
 * Returns: { message }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      return res.status(400).json({ message: 'Invalid Task ID format.' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    // Ownership check
    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) {
      return res.status(403).json({ message: 'Access denied. You do not own this task.' });
    }

    await Task.findByIdAndDelete(id);

    console.log(`🗑️   [tasks] Deleted: "${task.title}" (${id}) from epic ${task.epicId}`);
    res.json({ message: `Task "${task.title}" deleted successfully.` });
  } catch (error) {
    console.error(`❗  [tasks/DELETE /:id]`, error.message);
    next(error);
  }
});

// ─── POST /api/tasks/:id/comments ────────────────────────────────────────────
router.post('/:id/comments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) return res.status(403).json({ message: 'Access denied.' });

    const authorName = req.user.name || req.user.email || 'Member';
    task.comments.push({ text: text.trim(), author: authorName, createdAt: new Date() });
    await task.save();

    // ── Parse @mentions (e.g. @john or @user@email.com) and send notifications ─────
    const mentions = text.match(/@([a-zA-Z0-9_\.-]+)/g);
    if (mentions && mentions.length > 0) {
      const usernames = mentions.map((m) => m.slice(1).toLowerCase());
      const mentionedUsers = await User.find({
        $or: [
          { name: { $in: usernames.map((u) => new RegExp(u, 'i')) } },
          { email: { $in: usernames.map((u) => new RegExp(u, 'i')) } },
        ],
        _id: { $ne: req.user.id },
      });

      for (const u of mentionedUsers) {
        await Notification.create({
          recipient: u._id,
          sender: req.user.id,
          type: 'mention',
          taskId: task._id,
          message: `${authorName} mentioned you in issue ${task.issueKey || task.title}: "${text.slice(0, 80)}"`,
        });
      }
    }

    res.status(201).json({ task });
  } catch (error) {
    console.error('❗  [tasks/POST /:id/comments]', error.message);
    next(error);
  }
});

// ─── POST /api/tasks/:id/attachments ──────────────────────────────────────────
router.post('/:id/attachments', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, url } = req.body;
    if (!title || !url) {
      return res.status(400).json({ message: 'Attachment title and url are required.' });
    }

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.attachments.push({ title: title.trim(), url: url.trim() });
    task.activityLog.push({
      action: 'attachment_added',
      field: 'attachments',
      to: title.trim(),
      actor: req.user.name || req.user.email,
    });
    await task.save();

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/tasks/:id/clone ────────────────────────────────────────────────
router.post('/:id/clone', async (req, res, next) => {
  try {
    const original = await Task.findById(req.params.id);
    if (!original) return res.status(404).json({ message: 'Original task not found.' });

    // Fetch project to increment sequence for clone key
    const project = await Project.findByIdAndUpdate(original.projectId, { $inc: { seq: 1 } }, { new: true });
    const cloneKey = project ? `${project.key}-${project.seq}` : undefined;

    const cloneTask = await Task.create({
      title: `[CLONE] ${original.title}`,
      description: original.description,
      issueType: original.issueType,
      issueKey: cloneKey,
      projectId: original.projectId,
      epicId: original.epicId,
      sprintId: original.sprintId,
      priority: original.priority,
      status: 'todo',
      assignee: original.assignee,
      storyPoints: original.storyPoints,
      subtasks: original.subtasks ? original.subtasks.map((s) => ({ title: s.title, completed: false })) : [],
      activityLog: [{
        action: 'cloned',
        from: original.issueKey || original._id,
        actor: req.user.name || req.user.email,
      }],
    });

    // Create 'duplicates' issue link
    const IssueLink = require('../models/IssueLink');
    await IssueLink.create({
      sourceTaskId: cloneTask._id,
      targetTaskId: original._id,
      relationship: 'duplicates',
      createdBy: req.user.id,
    });

    res.status(201).json({ task: cloneTask, message: `Cloned issue as ${cloneTask.issueKey || cloneTask.title}` });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/tasks/:id/convert ──────────────────────────────────────────────
router.post('/:id/convert', async (req, res, next) => {
  try {
    const { targetIssueType } = req.body;
    const validTypes = ['story', 'bug', 'task', 'epic', 'subtask'];
    if (!validTypes.includes(targetIssueType)) {
      return res.status(400).json({ message: `Invalid targetIssueType: "${targetIssueType}"` });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const oldType = task.issueType;
    task.issueType = targetIssueType;
    task.activityLog.push({
      action: 'issue_type_converted',
      field: 'issueType',
      from: oldType,
      to: targetIssueType,
      actor: req.user.name || req.user.email,
    });
    await task.save();

    res.json({ task, message: `Converted ${task.issueKey || task.title} from ${oldType} to ${targetIssueType}.` });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/tasks/:id/watch ────────────────────────────────────────────────
router.post('/:id/watch', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const userIdx = task.watchers.indexOf(req.user.id);
    if (userIdx > -1) {
      task.watchers.splice(userIdx, 1);
    } else {
      task.watchers.push(req.user.id);
    }
    await task.save();

    res.json({ task, watching: task.watchers.includes(req.user.id) });
  } catch (error) {
    next(error);
  }
});

// ─── POST /api/tasks/:id/star ─────────────────────────────────────────────────
router.post('/:id/star', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.isStarred = !task.isStarred;
    await task.save();

    res.json({ task, isStarred: task.isStarred });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/tasks/:id/attachments/:attachmentId ─────────────────────────
router.delete('/:id/attachments/:attachmentId', async (req, res, next) => {
  try {
    const { id, attachmentId } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    task.attachments = task.attachments.filter((a) => a._id.toString() !== attachmentId);
    await task.save();

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// ─── DELETE /api/tasks/:id/comments/:commentId ───────────────────────────────
router.delete('/:id/comments/:commentId', async (req, res, next) => {
  try {
    const { id, commentId } = req.params;
    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: 'Task not found.' });

    const epic = await Epic.findOne({ _id: task.epicId, createdBy: req.user.id });
    if (!epic) return res.status(403).json({ message: 'Access denied.' });

    task.comments = task.comments.filter((c) => c._id.toString() !== commentId);
    await task.save();

    res.json({ task });
  } catch (error) {
    console.error('❗  [tasks/DELETE /:id/comments/:commentId]', error.message);
    next(error);
  }
});

// ─── Helper: Verify bulk task ownership ───────────────────────────────────────
/**
 * Returns the set of task IDs that the current user actually owns.
 * Ownership is traced via task.epicId → epic.createdBy.
 */
const filterOwnedTaskIds = async (taskIds, userId) => {
  const tasks = await Task.find({ _id: { $in: taskIds } }).select('epicId');
  const epicIds = [...new Set(tasks.map((t) => t.epicId.toString()))];
  const ownedEpics = await Epic.find({ _id: { $in: epicIds }, createdBy: userId }).select('_id');
  const ownedEpicSet = new Set(ownedEpics.map((e) => e._id.toString()));
  return tasks
    .filter((t) => ownedEpicSet.has(t.epicId.toString()))
    .map((t) => t._id);
};

// ─── POST /api/tasks/bulk-update ──────────────────────────────────────────────
router.post('/bulk-update', async (req, res, next) => {
  try {
    const { taskIds, updates } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0 || !updates) {
      return res.status(400).json({ message: 'taskIds array and updates object are required.' });
    }

    // Security: only operate on tasks the caller owns
    const ownedIds = await filterOwnedTaskIds(taskIds, req.user.id);
    if (ownedIds.length === 0) {
      return res.status(403).json({ message: 'Access denied. None of the tasks belong to you.' });
    }

    const payload = {};
    if (updates.status       !== undefined) payload.status       = updates.status;
    if (updates.priority     !== undefined) payload.priority     = updates.priority;
    if (updates.isArchived   !== undefined) payload.isArchived   = Boolean(updates.isArchived);
    if (updates.sprintId     !== undefined) payload.sprintId     = updates.sprintId || null;
    if (updates.assignee     !== undefined) payload.assignee     = updates.assignee.trim();
    if (updates.issueType    !== undefined) payload.issueType    = updates.issueType;
    if (updates.fixVersionId !== undefined) payload.fixVersionId = updates.fixVersionId || null;

    await Task.updateMany({ _id: { $in: ownedIds } }, { $set: payload });
    console.log(`✅  [tasks] Bulk update: ${ownedIds.length} task(s) by ${req.user.email}`);
    res.json({ message: `Updated ${ownedIds.length} task(s).` });
  } catch (error) {
    console.error('❗  [tasks/POST /bulk-update]', error.message);
    next(error);
  }
});

// ─── POST /api/tasks/bulk-delete ──────────────────────────────────────────────
router.post('/bulk-delete', async (req, res, next) => {
  try {
    const { taskIds } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds array is required.' });
    }

    await Task.deleteMany({ _id: { $in: taskIds } });
    console.log(`✅  [tasks] Bulk deleted: ${taskIds.length} tasks`);
    res.json({ message: `Deleted ${taskIds.length} tasks` });
  } catch (error) {
    console.error('❗  [tasks/POST /bulk-delete]', error.message);
    next(error);
  }
});

// ─── POST /api/tasks/:id/worklog ──────────────────────────────────────────────
router.post('/:id/worklog', async (req, res, next) => {
  try {
    const { timeSpentHours, comment, dateLogged } = req.body;
    const hours = parseFloat(timeSpentHours);

    if (isNaN(hours) || hours <= 0) {
      return res.status(400).json({ message: 'Valid positive timeSpentHours is required.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    const newLog = {
      userId: req.user.id,
      userName: req.user.name || req.user.email || 'Workspace Member',
      timeSpentHours: hours,
      dateLogged: dateLogged ? new Date(dateLogged) : new Date(),
      comment: comment || '',
      createdAt: new Date(),
    };

    task.workLogs.push(newLog);
    task.loggedHours = task.workLogs.reduce((sum, w) => sum + (w.timeSpentHours || 0), 0);
    if (task.originalEstimateHours > 0) {
      task.remainingEstimateHours = Math.max(0, task.originalEstimateHours - task.loggedHours);
    }

    task.activityLog.push({
      action: 'work_logged',
      field: 'loggedHours',
      from: `${task.loggedHours - hours}h`,
      to: `${task.loggedHours}h`,
      actor: req.user.name || req.user.email || 'Workspace Member',
    });

    await task.save();
    res.json(task);
  } catch (error) {
    console.error('❗ [tasks/POST /:id/worklog]', error.message);
    next(error);
  }
});

// ─── DELETE /api/tasks/:id/worklog/:logId ────────────────────────────────────
router.delete('/:id/worklog/:logId', async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found.' });
    }

    task.workLogs = task.workLogs.filter((w) => w._id.toString() !== req.params.logId);
    task.loggedHours = task.workLogs.reduce((sum, w) => sum + (w.timeSpentHours || 0), 0);
    if (task.originalEstimateHours > 0) {
      task.remainingEstimateHours = Math.max(0, task.originalEstimateHours - task.loggedHours);
    }

    await task.save();
    res.json(task);
  } catch (error) {
    console.error('❗ [tasks/DELETE /:id/worklog/:logId]', error.message);
    next(error);
  }
});

// ─── GET /api/tasks/export ───────────────────────────────────────────────────
router.get('/export', async (req, res, next) => {
  try {
    const { epicId, projectId, format = 'json' } = req.query;
    const filter = {};
    if (epicId) filter.epicId = epicId;
    if (projectId) filter.projectId = projectId;

    const tasks = await Task.find(filter).lean();

    if (format === 'csv') {
      const headers = ['issueKey', 'title', 'issueType', 'status', 'priority', 'assignee', 'storyPoints', 'originalEstimateHours', 'loggedHours'];
      const rows = tasks.map(t => [
        `"${t.issueKey || ''}"`,
        `"${(t.title || '').replace(/"/g, '""')}"`,
        `"${t.issueType || 'task'}"`,
        `"${t.status || 'todo'}"`,
        `"${t.priority || 'medium'}"`,
        `"${t.assignee || ''}"`,
        t.storyPoints || 0,
        t.originalEstimateHours || 0,
        t.loggedHours || 0
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=agileflow_issues_export.csv');
      return res.send(csvContent);
    }

    res.json(tasks);
  } catch (error) {
    console.error('❗ [tasks/GET /export]', error.message);
    next(error);
  }
});

// ─── POST /api/tasks/import ───────────────────────────────────────────────────
router.post('/import', async (req, res, next) => {
  try {
    const { epicId, projectId, tasks: importTasks } = req.body;
    if (!epicId || !Array.isArray(importTasks) || importTasks.length === 0) {
      return res.status(400).json({ message: 'epicId and tasks array are required.' });
    }

    const createdTasks = [];
    for (let i = 0; i < importTasks.length; i++) {
      const item = importTasks[i];
      if (!item.title) continue;

      const newTask = await Task.create({
        epicId,
        projectId: projectId || null,
        title: item.title,
        description: item.description || '',
        issueType: item.issueType || 'task',
        status: item.status || 'todo',
        priority: item.priority || 'medium',
        assignee: item.assignee || '',
        storyPoints: Number(item.storyPoints) || 0,
        originalEstimateHours: Number(item.originalEstimateHours) || 0,
        orderIndex: i,
        activityLog: [{ action: 'imported', actor: req.user.email || 'Workspace Member' }],
      });
      createdTasks.push(newTask);
    }

    res.status(201).json({ message: `Successfully imported ${createdTasks.length} task(s).`, tasks: createdTasks });
  } catch (error) {
    console.error('❗ [tasks/POST /import]', error.message);
    next(error);
  }
});

module.exports = router;
