import React from 'react';
import { Bookmark, Bug, CheckSquare, Zap, GitCommit } from 'lucide-react';

export const ISSUE_TYPE_CONFIG = {
  story: {
    label: 'Story',
    color: '#10b981', // Emerald green
    bg: 'rgba(16, 185, 129, 0.15)',
    icon: Bookmark,
  },
  bug: {
    label: 'Bug',
    color: '#ef4444', // Red
    bg: 'rgba(239, 68, 68, 0.15)',
    icon: Bug,
  },
  task: {
    label: 'Task',
    color: '#3b82f6', // Blue
    bg: 'rgba(59, 130, 246, 0.15)',
    icon: CheckSquare,
  },
  epic: {
    label: 'Epic',
    color: '#a855f7', // Purple
    bg: 'rgba(168, 85, 247, 0.15)',
    icon: Zap,
  },
  subtask: {
    label: 'Sub-task',
    color: '#14b8a6', // Teal
    bg: 'rgba(20, 184, 166, 0.15)',
    icon: GitCommit,
  },
};

export default function IssueTypeIcon({ type = 'task', size = 14, className = '' }) {
  const config = ISSUE_TYPE_CONFIG[type?.toLowerCase()] || ISSUE_TYPE_CONFIG.task;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center justify-center p-1 rounded ${className}`}
      style={{ background: config.bg, color: config.color }}
      title={config.label}
    >
      <IconComponent size={size} />
    </span>
  );
}
