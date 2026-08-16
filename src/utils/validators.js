// ─── utils/validators.js ─────────────────────────────────────────────────────
// Client-side validation utilities for form fields. Returns error messages
// or null if valid. Used across Create/Edit modals throughout the app.

export function validateTaskForm(values) {
  const errors = {};
  if (!values.title?.trim()) {
    errors.title = 'Task title is required';
  } else if (values.title.trim().length < 3) {
    errors.title = 'Title must be at least 3 characters';
  } else if (values.title.length > 255) {
    errors.title = 'Title must be under 255 characters';
  }
  if (!values.epicId) errors.epicId = 'An epic must be selected';
  if (values.storyPoints !== undefined && values.storyPoints !== '') {
    const pts = parseInt(values.storyPoints);
    if (isNaN(pts) || pts < 0 || pts > 999) errors.storyPoints = 'Story points must be 0-999';
  }
  if (values.dueDate && values.startDate) {
    if (new Date(values.dueDate) < new Date(values.startDate)) errors.dueDate = 'Due date cannot be before start date';
  }
  if (values.estimatedHours !== undefined && values.estimatedHours !== '') {
    const hrs = parseFloat(values.estimatedHours);
    if (isNaN(hrs) || hrs < 0 || hrs > 9999) errors.estimatedHours = 'Estimated hours must be 0-9999';
  }
  return errors;
}

export function validateEpicForm(values) {
  const errors = {};
  if (!values.title?.trim()) errors.title = 'Epic title is required';
  else if (values.title.length > 200) errors.title = 'Title must be under 200 characters';
  if (values.startDate && values.dueDate && new Date(values.dueDate) < new Date(values.startDate)) {
    errors.dueDate = 'Due date cannot be before start date';
  }
  return errors;
}

export function validateSprintForm(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Sprint name is required';
  if (!values.startDate) errors.startDate = 'Start date is required';
  if (!values.endDate) errors.endDate = 'End date is required';
  if (values.startDate && values.endDate && new Date(values.endDate) <= new Date(values.startDate)) {
    errors.endDate = 'End date must be after start date';
  }
  const days = values.startDate && values.endDate ? Math.ceil((new Date(values.endDate) - new Date(values.startDate)) / 86400000) : 0;
  if (days > 60) errors.endDate = 'Sprint duration cannot exceed 60 days';
  return errors;
}

export function validateProjectForm(values) {
  const errors = {};
  if (!values.name?.trim()) errors.name = 'Project name is required';
  if (!values.key?.trim()) {
    errors.key = 'Project key is required';
  } else if (!/^[A-Z]{2,6}$/.test(values.key.toUpperCase())) {
    errors.key = 'Key must be 2-6 uppercase letters (e.g. AGF)';
  }
  return errors;
}

export function isFormValid(errors) {
  return Object.keys(errors).length === 0;
}

// ─── utils/formatters.js ─────────────────────────────────────────────────────
// Formatting utilities for dates, durations, numbers, and text.

export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts });
  } catch { return '—'; }
}

export function formatRelativeDate(dateStr) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(dateStr);
}

export function formatDuration(hours) {
  if (!hours && hours !== 0) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 8).toFixed(1)}d`;
}

export function formatStoryPoints(pts) {
  if (pts === null || pts === undefined) return '—';
  return `${pts} ${pts === 1 ? 'pt' : 'pts'}`;
}

export function truncate(str, max = 60) {
  if (!str) return '';
  return str.length <= max ? str : str.slice(0, max - 3) + '…';
}

export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function formatNumber(num) {
  if (num === null || num === undefined) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

export function formatPercent(value, total) {
  if (!total) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

export function priorityToNumber(priority) {
  return { critical: 4, high: 3, medium: 2, low: 1 }[priority] ?? 0;
}
