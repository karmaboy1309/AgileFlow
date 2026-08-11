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
  const errors = [];
  const mongoFilter = {};

  if (!jqlString || typeof jqlString !== 'string' || !jqlString.trim()) {
    return { filter: mongoFilter, errors };
  }

  const clauses = jqlString.split(/\s+AND\s+/i);
  const allowedFields = new Set([
    'type', 'issuetype', 'status', 'priority', 'assignee', 'key', 'issuekey',
    'project', 'projectkey', 'text', 'summary', 'description'
  ]);

  for (const clause of clauses) {
    const trimmed = clause.trim();
    if (!trimmed) continue;

    // Match field = value, field != value, field ~ value, field IN value
    const match = trimmed.match(/^([a-zA-Z0-9_\.-]+)\s*(=|!=|~|IN)\s*(.+)$/i);
    if (!match) {
      errors.push(`Invalid JQL clause syntax: "${trimmed}"`);
      continue;
    }

    const [, fieldRaw, operator, valueRaw] = match;
    const field = fieldRaw.toLowerCase();
    const value = valueRaw.trim().replace(/^["']|["']$/g, '');

    if (!allowedFields.has(field)) {
      errors.push(`Unsupported JQL field: "${fieldRaw}"`);
      continue;
    }

    // Validate operator matching rules
    if (operator === '~' && !['text', 'summary', 'description', 'assignee'].includes(field)) {
      errors.push(`Operator "~" is only supported for text fields, not for "${fieldRaw}"`);
      continue;
    }

    switch (field) {
      case 'type':
      case 'issuetype':
        if (operator === '!=') mongoFilter.issueType = { $ne: value.toLowerCase() };
        else if (operator === '=') mongoFilter.issueType = value.toLowerCase();
        else errors.push(`Operator "${operator}" is not supported for field "${fieldRaw}". Use "=" or "!=".`);
        break;

      case 'status':
        if (operator === '!=') mongoFilter.status = { $ne: value.toLowerCase() };
        else if (operator === '=') mongoFilter.status = value.toLowerCase();
        else errors.push(`Operator "${operator}" is not supported for field "${fieldRaw}". Use "=" or "!=".`);
        break;

      case 'priority':
        if (operator === '!=') mongoFilter.priority = { $ne: value.toLowerCase() };
        else if (operator === '=') mongoFilter.priority = value.toLowerCase();
        else errors.push(`Operator "${operator}" is not supported for field "${fieldRaw}". Use "=" or "!=".`);
        break;

      case 'assignee':
        if (operator === '!=') mongoFilter.assignee = { $ne: value };
        else if (operator === '=' || operator === '~') mongoFilter.assignee = new RegExp(value, 'i');
        else errors.push(`Operator "${operator}" is not supported for field "${fieldRaw}". Use "=", "!=" or "~".`);
        break;

      case 'key':
      case 'issuekey':
        if (operator === '=') mongoFilter.issueKey = value.toUpperCase();
        else errors.push(`Operator "${operator}" is not supported for field "${fieldRaw}". Use "=".`);
        break;

      case 'project':
      case 'projectkey': {
        if (operator !== '=') {
          errors.push(`Operator "${operator}" is not supported for field "${fieldRaw}". Use "=".`);
          break;
        }
        const projId = userProjectsMap[value.toUpperCase()];
        if (projId) {
          mongoFilter.projectId = projId;
        } else {
          errors.push(`Project key "${value.toUpperCase()}" not found in your workspace.`);
        }
        break;
      }

      case 'text':
      case 'summary':
      case 'description':
        if (operator !== '~' && operator !== '=') {
          errors.push(`Operator "${operator}" is not supported for text searches. Use "=" or "~".`);
          break;
        }
        mongoFilter.$or = [
          { title: new RegExp(value, 'i') },
          { description: new RegExp(value, 'i') },
        ];
        break;

      default:
        break;
    }
  }

  return { filter: mongoFilter, errors };
}

// POST /api/jql/search
router.post('/search', async (req, res, next) => {
  try {
    const { jql, limit = 50, skip = 0 } = req.body;

    // Fetch user's projects to resolve project key in JQL
    const projects = await Project.find({ createdBy: req.user.id }).select('_id key');
    const userProjectsMap = {};
    projects.forEach(p => { userProjectsMap[p.key] = p._id; });

    const { filter: mongoFilter, errors } = parseJQL(jql, userProjectsMap);

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Malformed JQL query.',
        errors,
      });
    }

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
