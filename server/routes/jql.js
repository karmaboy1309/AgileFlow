'use strict';

const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const Project = require('../models/Project');
const protect = require('../middleware/auth');

router.use(protect);

/**
 * Parses a simple JQL query string into a MongoDB query filter object.
 * Example: 'type = bug AND status = "in-progress" AND priority = high'
 */
function parseJQL(jqlString, userProjectsMap) {
  if (!jqlString || typeof jqlString !== 'string' || !jqlString.trim()) {
    return {};
  }

  const clauses = jqlString.split(/\s+AND\s+/i);
  const mongoFilter = {};

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    // Match field = value or field != value or field ~ value
    const match = trimmed.match(/^([a-zA-Z0-9_\.-]+)\s*(=|!=|~|IN)\s*(.+)$/i);
    if (!match) continue;

    const [, fieldRaw, operator, valueRaw] = match;
    const field = fieldRaw.toLowerCase();
    let value = valueRaw.trim().replace(/^["']|["']$/g, '');

    switch (field) {
      case 'type':
      case 'issuetype':
        if (operator === '!=') mongoFilter.issueType = { $ne: value.toLowerCase() };
        else mongoFilter.issueType = value.toLowerCase();
        break;

      case 'status':
        if (operator === '!=') mongoFilter.status = { $ne: value.toLowerCase() };
        else mongoFilter.status = value.toLowerCase();
        break;

      case 'priority':
        if (operator === '!=') mongoFilter.priority = { $ne: value.toLowerCase() };
        else mongoFilter.priority = value.toLowerCase();
        break;

      case 'assignee':
        if (operator === '!=') mongoFilter.assignee = { $ne: value };
        else mongoFilter.assignee = new RegExp(value, 'i');
        break;

      case 'key':
      case 'issuekey':
        mongoFilter.issueKey = value.toUpperCase();
        break;

      case 'project':
      case 'projectkey': {
        const projId = userProjectsMap[value.toUpperCase()];
        if (projId) mongoFilter.projectId = projId;
        break;
      }

      case 'text':
      case 'summary':
      case 'description':
        mongoFilter.$or = [
          { title: new RegExp(value, 'i') },
          { description: new RegExp(value, 'i') },
        ];
        break;

      default:
        break;
    }
  }

  return mongoFilter;
}

// POST /api/jql/search
router.post('/search', async (req, res, next) => {
  try {
    const { jql, limit = 50, skip = 0 } = req.body;

    // Fetch user's projects to resolve project key in JQL
    const projects = await Project.find({ createdBy: req.user.id }).select('_id key');
    const userProjectsMap = {};
    projects.forEach(p => { userProjectsMap[p.key] = p._id; });

    const mongoFilter = parseJQL(jql, userProjectsMap);

    const [tasks, total] = await Promise.all([
      Task.find(mongoFilter)
        .sort({ updatedAt: -1 })
        .skip(Number(skip))
        .limit(Math.min(Number(limit), 100)),
      Task.countDocuments(mongoFilter),
    ]);

    res.json({
      jql,
      mongoFilter,
      total,
      tasks,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
