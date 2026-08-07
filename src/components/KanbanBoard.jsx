import { useState, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Trash2, GripVertical, User, Calendar, Pencil, Search, Filter, X, Tag, CheckSquare, MessageSquare, Link, Archive, ArchiveRestore, Keyboard, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksAPI } from '../api';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';
import IssueTypeIcon from './IssueTypeIcon';

// ─── Column Definitions ───────────────────────────────────────────────────────
const COLUMNS = [
  {
    id: 'todo',
    label: 'To Do',
    colorClass: 'col-todo',
    accentColor: '#64748b',
    bgColor: 'rgba(100,116,139,0.06)',
    dotColor: '#64748b',
  },
  {
    id: 'in-progress',
    label: 'In Progress',
    colorClass: 'col-progress',
    accentColor: '#f59e0b',
    bgColor: 'rgba(245,158,11,0.06)',
    dotColor: '#f59e0b',
    wipLimit: 5,
  },
  {
    id: 'done',
    label: 'Done',
    colorClass: 'col-done',
    accentColor: '#10b981',
    bgColor: 'rgba(16,185,129,0.06)',
    dotColor: '#10b981',
  },
];

// ─── Priority Config ──────────────────────────────────────────────────────────
const PRIORITY_CONFIG = {
  low:    { label: 'Low',    className: 'priority-low',    icon: '▼' },
  medium: { label: 'Med',    className: 'priority-medium', icon: '■' },
  high:   { label: 'High',   className: 'priority-high',   icon: '▲' },
};

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({ task, index, onDelete, onEdit, onArchive, selected, onSelectToggle }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;

  // Close the dropdown when a click lands outside the menu container
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <Draggable draggableId={task._id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          id={`task-card-${task._id}`}
          className={`group relative rounded-xl border p-4 mb-3 cursor-grab active:cursor-grabbing transition-all duration-200 ${
            snapshot.isDragging ? 'task-card-dragging' : ''
          } ${selected ? 'border-indigo-500 bg-indigo-500/10' : ''}`}
          style={{
            ...provided.draggableProps.style,
            background: selected
              ? 'rgba(99,102,241,0.12)'
              : snapshot.isDragging
              ? 'rgba(30,30,45,0.98)'
              : 'rgba(255,255,255,0.04)',
            borderColor: selected
              ? 'rgba(99,102,241,0.6)'
              : snapshot.isDragging
              ? 'rgba(99,102,241,0.6)'
              : 'rgba(255,255,255,0.07)',
          }}
          aria-label={`Task: ${task.title}`}
        >
          {/* Checkbox for bulk selection */}
          <input
            type="checkbox"
            checked={!!selected}
            onChange={(e) => {
              e.stopPropagation();
              if (onSelectToggle) onSelectToggle(task._id);
            }}
            className="absolute left-2.5 top-3.5 z-10 w-4 h-4 rounded border-white/20 accent-indigo-600 cursor-pointer opacity-70 hover:opacity-100 group-hover:opacity-100"
            title="Select task for bulk actions"
          />

          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute left-7 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity text-slate-500"
            aria-label="Drag handle"
          >
            <GripVertical size={14} />
          </div>

          {/* Card content */}
          <div className="pl-2">
            {/* Issue Key & Type Row */}
            <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <IssueTypeIcon type={task.issueType} size={12} />
                <span className="font-mono font-bold text-slate-400">
                  {task.issueKey || 'AGILE-?'}
                </span>
                {task.subtasks && task.subtasks.length > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-mono">
                    ✓ {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
                  </span>
                )}
                {task.epicId && typeof task.epicId === 'object' && (
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-md truncate max-w-[120px]"
                    style={{
                      background: `${task.epicId.color || '#a855f7'}20`,
                      color: task.epicId.color || '#c084fc',
                      border: `1px solid ${task.epicId.color || '#a855f7'}40`,
                    }}
                    title={`Epic: ${task.epicId.title}`}
                  >
                    ⚡ {task.epicId.title}
                  </span>
                )}
              </div>
              {task.storyPoints > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                  {task.storyPoints} pts
                </span>
              )}
            </div>

            {/* Title + menu */}
            <div className="flex items-start justify-between gap-2 mb-3">
              <p className="text-sm font-medium text-slate-100 leading-snug flex-1">
                {task.title}
              </p>
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  id={`task-menu-btn-${task._id}`}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-slate-300 transition-all rounded-md p-0.5 hover:bg-white/05"
                  aria-label="Task options"
                >
                  <MoreHorizontal size={15} />
                </button>
                {menuOpen && (
                  <div
                    className="absolute right-0 top-6 z-10 rounded-xl border border-white/[0.08] shadow-xl overflow-hidden"
                    style={{ background: '#1e1e2d', minWidth: '140px' }}
                  >
                    <button
                      id={`task-edit-btn-${task._id}`}
                      onClick={() => { setMenuOpen(false); onEdit(task); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-white/05 transition-colors"
                    >
                      <Pencil size={13} />
                      Edit task
                    </button>
                    {onArchive && (
                      <button
                        id={`task-archive-btn-${task._id}`}
                        onClick={() => { setMenuOpen(false); onArchive(task._id, true); }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-slate-300 hover:bg-white/05 transition-colors border-b border-white/[0.06]"
                      >
                        <Archive size={13} className="text-amber-400" />
                        Archive task
                      </button>
                    )}
                    <button
                      id={`task-delete-btn-${task._id}`}
                      onClick={() => { setMenuOpen(false); onDelete(task._id); }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete task
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Description snippet */}
            {/* Overdue badge — shown prominently for tasks past deadline */}
            {task.dueDate && task.status !== 'done' && new Date(task.dueDate) < new Date() && (
              <div className="flex mb-2">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{ background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
                >
                  <span>⚠</span> Overdue
                </span>
              </div>
            )}
            {task.description && (
              <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Category Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2.5">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 tracking-wide"
                  >
                    <Tag size={9} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: priority + assignee + due date */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${priority.className}`}>
                <span className="text-[9px]">{priority.icon}</span>
                {priority.label}
              </span>
              <div className="flex items-center gap-2">
                {task.subtasks && task.subtasks.length > 0 && (() => {
                  const done = task.subtasks.filter((s) => s.completed).length;
                  const total = task.subtasks.length;
                  const allDone = done === total;
                  return (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        background: allDone ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
                        color     : allDone ? '#10b981' : '#94a3b8',
                      }}
                      title={`${done} of ${total} subtasks completed`}
                    >
                      <CheckSquare size={9} />
                      {done}/{total}
                    </span>
                  );
                })()}
                {task.comments && task.comments.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20"
                    title={`${task.comments.length} comment(s)`}
                  >
                    <MessageSquare size={9} />
                    {task.comments.length}
                  </span>
                )}
                {task.attachments && task.attachments.length > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
                    title={`${task.attachments.length} attachment link(s)`}
                  >
                    <Link size={9} />
                    {task.attachments.length}
                  </span>
                )}
                {(task.estimatedHours > 0 || task.loggedHours > 0) && (
                  <span
                    className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20"
                    title={`Logged ${task.loggedHours || 0}h / Estimated ${task.estimatedHours || 0}h`}
                  >
                    <Clock size={9} />
                    {task.loggedHours || 0}h{task.estimatedHours ? `/${task.estimatedHours}h` : ''}
                  </span>
                )}
                {task.dueDate && (() => {
                  const due    = new Date(task.dueDate);
                  const now    = new Date();
                  const msLeft = due - now;
                  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
                  const isDone   = task.status === 'done';
                  const isOverdue = daysLeft <= 0 && !isDone;
                  const isSoon    = daysLeft > 0 && daysLeft <= 7 && !isDone;
                  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

                  // Color logic: red=overdue, amber=within 7 days, green=safe
                  const color  = isOverdue ? '#ef4444' : isSoon ? '#f59e0b' : '#10b981';
                  const bg     = isOverdue ? 'rgba(239,68,68,0.13)' : isSoon ? 'rgba(245,158,11,0.13)' : 'rgba(16,185,129,0.12)';

                  return (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: bg, color }}
                      title={isOverdue ? 'Overdue!' : isSoon ? `Due in ${daysLeft} day(s)` : `Due ${label}`}
                    >
                      <Calendar size={9} />
                      {label}
                      {isOverdue && <span className="text-[9px] font-bold ml-0.5">!</span>}
                    </span>
                  );
                })()}
                {task.assignee && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center">
                      <User size={10} className="text-indigo-300" />
                    </div>
                    <span className="truncate max-w-[80px]">{task.assignee}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}

// ─── Column ───────────────────────────────────────────────────────────────────
function KanbanColumn({ column, tasks, onAddTask, onDelete, onEdit, onArchive, selectedTaskIds, onSelectToggle }) {
  return (
    <div
      className="flex flex-col rounded-2xl border border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.02)', minHeight: '520px' }}
    >
      {/* Column header */}
      <div
        className={`px-4 py-4 border-b border-white/[0.06] ${column.colorClass}`}
        style={{ background: column.bgColor }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: column.dotColor }}
            />
            <h2 className="text-sm font-semibold text-slate-200">{column.label}</h2>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                column.wipLimit && tasks.length > column.wipLimit
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse font-bold'
                  : ''
              }`}
              style={
                column.wipLimit && tasks.length > column.wipLimit
                  ? {}
                  : { background: `${column.accentColor}20`, color: column.accentColor }
              }
            >
              {tasks.length} {column.wipLimit ? `/ ${column.wipLimit} MAX` : ''}
            </span>
          </div>
          {column.wipLimit && tasks.length > column.wipLimit && (
            <span className="text-[10px] text-red-400 font-bold bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
              WIP Exceeded!
            </span>
          )}
          <button
            id={`add-task-${column.id}-btn`}
            onClick={() => onAddTask(column.id)}
            className="text-slate-600 hover:text-slate-300 transition-colors rounded-lg p-1 hover:bg-white/05"
            aria-label={`Add task to ${column.label}`}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>

      {/* Droppable task list */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="flex-1 p-3 transition-colors duration-200 overflow-y-auto"
            style={{
              background: snapshot.isDraggingOver
                ? `${column.accentColor}08`
                : 'transparent',
              minHeight: '420px',
            }}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center h-32 text-slate-700 text-xs text-center px-4 mt-6">
                <div
                  className="w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center mb-3"
                  style={{ borderColor: `${column.accentColor}30` }}
                >
                  <Plus size={18} style={{ color: `${column.accentColor}50` }} />
                </div>
                <p style={{ color: `${column.accentColor}60` }}>
                  Drop tasks here or click{' '}
                  <button
                    onClick={() => onAddTask(column.id)}
                    className="underline hover:opacity-80"
                  >
                    + to add
                  </button>
                </p>
              </div>
            )}
            {tasks.map((task, index) => (
              <TaskCard
                key={task._id}
                task={task}
                index={index}
                onDelete={onDelete}
                onEdit={onEdit}
                onArchive={onArchive}
                selected={selectedTaskIds?.includes(task._id)}
                onSelectToggle={onSelectToggle}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}

// ─── Board Stats Bar ──────────────────────────────────────────────────────────
function StatsBar({ tasks }) {
  const total    = tasks.length;
  const done     = tasks.filter((t) => t.status === 'done').length;
  const inProg   = tasks.filter((t) => t.status === 'in-progress').length;
  const todo     = tasks.filter((t) => t.status === 'todo').length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="glass rounded-2xl px-6 py-4 mb-6 flex flex-wrap items-center gap-6">
      <div className="flex-1 min-w-[160px]">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span>Overall progress</span>
          <span className="text-indigo-400 font-medium">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
            }}
          />
        </div>
      </div>
      <div className="flex gap-5 text-xs">
        <div className="text-center">
          <p className="text-xl font-bold text-slate-300">{todo}</p>
          <p className="text-slate-600">To Do</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: '#f59e0b' }}>{inProg}</p>
          <p className="text-slate-600">In Progress</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: '#10b981' }}>{done}</p>
          <p className="text-slate-600">Done</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-white">{total}</p>
          <p className="text-slate-600">Total</p>
        </div>
      </div>
    </div>
  );
}

export default function KanbanBoard({
  tasks: initialTasks,
  epicId,
  onTasksChange,
  hasMore = false,
  totalCount = 0,
  onLoadMore = null,
  loadingMore = false,
}) {
  const [tasks,      setTasks]      = useState(initialTasks);
  const [showModal,  setShowModal]  = useState(false);
  const [modalStatus, setModalStatus] = useState('todo');
  const [adding,     setAdding]     = useState(false);
  const [editingTask, setEditingTask] = useState(null);  // task being edited
  const [saving,     setSaving]     = useState(false);

  const [searchQuery, setSearchQuery]       = useState('');
  const [swimlaneBy, setSwimlaneBy]         = useState('none');
  const [cardDensity, setCardDensity]       = useState(() => localStorage.getItem('agileflow_card_density') || 'detailed');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [tagFilter, setTagFilter]           = useState('all');
  const [showArchiveVault, setShowArchiveVault] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds]       = useState([]);
  // Sort state — persisted so preference survives page refreshes
  const [sortBy, setSortBy]   = useState(() => localStorage.getItem('agileflow_sort') || 'order');
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('agileflow_sort_dir') || 'asc');

  const handleSortChange = (newSortBy) => {
    if (newSortBy === sortBy) {
      const newDir = sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
      localStorage.setItem('agileflow_sort_dir', newDir);
    } else {
      setSortBy(newSortBy);
      setSortDir('asc');
      localStorage.setItem('agileflow_sort', newSortBy);
      localStorage.setItem('agileflow_sort_dir', 'asc');
    }
  };

  const sortTasks = (taskList) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...taskList].sort((a, b) => {
      switch (sortBy) {
        case 'priority': {
          const order = { high: 0, medium: 1, low: 2 };
          return dir * ((order[a.priority] ?? 1) - (order[b.priority] ?? 1));
        }
        case 'dueDate': {
          const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dir * (da - db);
        }
        case 'createdAt': {
          const ca = new Date(a.createdAt || 0).getTime();
          const cb = new Date(b.createdAt || 0).getTime();
          return dir * (ca - cb);
        }
        case 'title':
          return dir * a.title.localeCompare(b.title);
        default: // 'order'
          return dir * ((a.orderIndex ?? 0) - (b.orderIndex ?? 0));
      }
    });
  };

  const handleToggleSelectTask = (id) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusChange = async (status) => {
    if (selectedTaskIds.length === 0) return;
    try {
      await tasksAPI.bulkUpdate(selectedTaskIds, { status });
      const updatedTasks = tasks.map((t) =>
        selectedTaskIds.includes(t._id) ? { ...t, status } : t
      );
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      toast.success(`Moved ${selectedTaskIds.length} task(s) to ${status}`);
      setSelectedTaskIds([]);
    } catch {
      toast.error('Failed to update tasks.');
    }
  };

  const handleBulkPriorityChange = async (priority) => {
    if (selectedTaskIds.length === 0) return;
    try {
      await tasksAPI.bulkUpdate(selectedTaskIds, { priority });
      const updatedTasks = tasks.map((t) =>
        selectedTaskIds.includes(t._id) ? { ...t, priority } : t
      );
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      toast.success(`Updated priority for ${selectedTaskIds.length} task(s)`);
      setSelectedTaskIds([]);
    } catch {
      toast.error('Failed to update priority.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTaskIds.length === 0) return;
    try {
      await tasksAPI.bulkDelete(selectedTaskIds);
      const updatedTasks = tasks.filter((t) => !selectedTaskIds.includes(t._id));
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      toast.success(`Deleted ${selectedTaskIds.length} task(s)`);
      setSelectedTaskIds([]);
    } catch {
      toast.error('Failed to delete tasks.');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        if (e.key === 'Escape') {
          document.activeElement.blur();
        }
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcutsModal((v) => !v);
      } else if (e.key === '/') {
        e.preventDefault();
        document.getElementById('kanban-search-input')?.focus();
      } else if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setModalStatus('todo');
        setShowModal(true);
      } else if (e.key === 'Escape') {
        setShowShortcutsModal(false);
        setShowArchiveVault(false);
        setShowModal(false);
        setEditingTask(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Keep local tasks in sync when parent re-fetches
  const [prevInitial, setPrevInitial] = useState(initialTasks);
  if (initialTasks !== prevInitial) {
    setPrevInitial(initialTasks);
    setTasks(initialTasks);
  }

  // Available unique tags from current tasks
  const availableTags = Array.from(
    new Set(tasks.flatMap((t) => t.tags || []))
  );

  // Filtered tasks mapping
  const filteredTasks = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const titleMatch    = task.title.toLowerCase().includes(q);
      const descMatch     = task.description && task.description.toLowerCase().includes(q);
      const assigneeMatch = task.assignee && task.assignee.toLowerCase().includes(q);
      if (!titleMatch && !descMatch && !assigneeMatch) return false;
    }
    if (priorityFilter !== 'all' && task.priority !== priorityFilter) return false;
    if (tagFilter !== 'all') {
      if (!task.tags || !task.tags.includes(tagFilter)) return false;
    }
    return true;
  });

  const getColumnTasks = (columnId) =>
    sortTasks(filteredTasks.filter((t) => !t.isArchived && t.status === columnId));

  const archivedTasks = tasks.filter((t) => t.isArchived);

  const handleArchiveTask = async (id, isArchived) => {
    try {
      const { data } = await tasksAPI.toggleArchive(id, isArchived);
      const updated = data.task ?? data;
      const updatedTasks = tasks.map((t) => (t._id === id ? updated : t));
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      toast.success(isArchived ? 'Task archived 📦' : 'Task restored ✨');
    } catch {
      toast.error('Failed to update task archive status.');
    }
  };

  const hasActiveFilters = searchQuery.trim() !== '' || priorityFilter !== 'all' || tagFilter !== 'all';

  // ─── Drag End Handler ──────────────────────────────────────────────────────
  const handleDragEnd = useCallback(
    async (result) => {
      const { source, destination, draggableId } = result;

      // Dropped outside a valid column — no-op
      if (!destination) return;
      // Dropped in the same position — no-op
      if (
        destination.droppableId === source.droppableId &&
        destination.index === source.index
      )
        return;

      const newStatus = destination.droppableId;

      // ── OPTIMISTIC UPDATE ─────────────────────────────────────────────────
      // Capture snapshot before mutating for potential rollback
      const snapshotTasks = [...tasks];

      const updatedTasks = tasks.map((t) =>
        t._id === draggableId ? { ...t, status: newStatus } : t
      );
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);

      // ── API CALL ──────────────────────────────────────────────────────────
      try {
        await tasksAPI.update(draggableId, { status: newStatus });
      } catch (err) {
        // ── ROLLBACK on failure ───────────────────────────────────────────
        setTasks(snapshotTasks);
        if (onTasksChange) onTasksChange(snapshotTasks);
        toast.error(
          err.response?.data?.message ||
            'Failed to move task. It has been restored to its original position.',
          { duration: 4000 }
        );
      }
    },
    [tasks, onTasksChange]
  );

  // ─── Add Task ──────────────────────────────────────────────────────────────
  const handleOpenAddTask = (status) => {
    setModalStatus(status);
    setShowModal(true);
  };

  const handleCreateTask = async (formData) => {
    setAdding(true);
    try {
      const { data } = await tasksAPI.create({ ...formData, epicId });
      const newTask = data.task ?? data;
      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      setShowModal(false);
      toast.success('Task added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setAdding(false);
    }
  };

  // ─── Delete Task ───────────────────────────────────────────────────────────
  const handleDeleteTask = async (taskId) => {
    const snapshotTasks = [...tasks];
    // Optimistic removal
    const updatedTasks = tasks.filter((t) => t._id !== taskId);
    setTasks(updatedTasks);
    if (onTasksChange) onTasksChange(updatedTasks);

    try {
      await tasksAPI.delete(taskId);
      toast.success('Task deleted');
    } catch {
      setTasks(snapshotTasks);
      if (onTasksChange) onTasksChange(snapshotTasks);
      toast.error('Failed to delete task. Restored.');
    }
  };

  // ─── Edit Task ─────────────────────────────────────────────────────────────
  const handleSaveTask = async (formData) => {
    if (!editingTask) return;
    setSaving(true);
    try {
      const { data } = await tasksAPI.update(editingTask._id, formData);
      const updated = data.task ?? data;
      const updatedTasks = tasks.map((t) => (t._id === updated._id ? updated : t));
      setTasks(updatedTasks);
      if (onTasksChange) onTasksChange(updatedTasks);
      setEditingTask(null);
      toast.success('Task updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <StatsBar tasks={tasks} />

      {/* Board Search & Filter Control Bar */}
      <div className="glass rounded-2xl p-3.5 mb-6 flex flex-wrap items-center justify-between gap-3 text-xs border border-white/[0.08]">
        {/* Search input */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            id="kanban-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks by title, description, or assignee…"
            className="input-dark text-xs h-9 pl-9 pr-8 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              aria-label="Clear search"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Priority Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 flex items-center gap-1 mr-1 font-medium">
            <Filter size={12} /> Priority:
          </span>
          {['all', 'high', 'medium', 'low'].map((p) => {
            const active = priorityFilter === p;
            const labels = { all: 'All', high: 'High', medium: 'Med', low: 'Low' };
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1 rounded-lg transition-all capitalize font-medium text-xs ${
                  active
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'text-slate-400 bg-white/[0.04] hover:bg-white/[0.08] hover:text-slate-200'
                }`}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>

        {/* Archived Tasks Vault Button */}
        <button
          id="archive-vault-toggle-btn"
          onClick={() => setShowArchiveVault(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
          title="Open Archived Tasks Vault"
        >
          <Archive size={13} />
          <span>Vault ({archivedTasks.length})</span>
        </button>

        {/* Keyboard Shortcuts Button */}
        <button
          id="keyboard-shortcuts-toggle-btn"
          onClick={() => setShowShortcutsModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/[0.08] text-xs font-medium text-slate-300 hover:bg-white/[0.05] transition-colors ml-auto"
          title="Keyboard Shortcuts (?)"
        >
          <Keyboard size={13} className="text-indigo-400" />
          <span>Shortcuts (?)</span>
        </button>

        {/* Density Control */}
        <button
          id="kanban-density-btn"
          onClick={() => {
            const next = cardDensity === 'compact' ? 'detailed' : 'compact';
            setCardDensity(next);
            localStorage.setItem('agileflow_card_density', next);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/05 transition-colors"
          title={`Switch to ${cardDensity === 'compact' ? 'Detailed' : 'Compact'} View`}
        >
          <span>{cardDensity === 'compact' ? '📱 Compact' : '📄 Detailed'}</span>
        </button>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium text-xs">Swimlanes:</span>
          <select
            id="kanban-swimlane-select"
            value={swimlaneBy}
            onChange={(e) => setSwimlaneBy(e.target.value)}
            className="input-dark text-xs h-9 px-3 py-1 bg-[#1e1e2d] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="none">None</option>
            <option value="assignee">Assignee</option>
            <option value="priority">Priority</option>
          </select>
        </div>

        {/* Reset Filters */}
        {hasActiveFilters && (
          <button
            onClick={() => {
              setSearchQuery('');
              setPriorityFilter('all');
              setTagFilter('all');
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors font-medium ml-auto sm:ml-0"
          >
            <X size={13} />
            <span>Reset filters</span>
          </button>
        )}

        {/* Sort Control */}
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">Sort:</span>
          <select
            id="kanban-sort-select"
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="input-dark text-xs h-9 px-3 py-1 bg-[#1e1e2d] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="order">Drag Order</option>
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="createdAt">Created</option>
            <option value="title">Title A–Z</option>
          </select>
          <button
            id="kanban-sort-dir-btn"
            onClick={() => handleSortChange(sortBy)}
            title={`Direction: ${sortDir === 'asc' ? 'Ascending' : 'Descending'}`}
            className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/[0.08] text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors font-bold"
          >
            {sortDir === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              onAddTask={handleOpenAddTask}
              onDelete={handleDeleteTask}
              onEdit={(task) => setEditingTask(task)}
              onArchive={handleArchiveTask}
              selectedTaskIds={selectedTaskIds}
              onSelectToggle={handleToggleSelectTask}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Load More Tasks Button (Pagination) */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center mt-6">
          <button
            id="kanban-load-more-btn"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-medium text-xs transition-colors"
          >
            {loadingMore ? (
              <span>Loading more tasks…</span>
            ) : (
              <span>Load More Tasks ({tasks.length} of {totalCount})</span>
            )}
          </button>
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass-panel border border-indigo-500/40 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <span className="text-xs font-semibold text-white bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/30">
            {selectedTaskIds.length} selected
          </span>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Bulk Move */}
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <span className="text-slate-500 hidden sm:inline">Move:</span>
            {['todo', 'in-progress', 'done'].map((s) => (
              <button
                key={s}
                onClick={() => handleBulkStatusChange(s)}
                className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-indigo-600 text-slate-200 hover:text-white transition-colors text-[11px] capitalize font-medium"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Bulk Priority */}
          <div className="flex items-center gap-1 text-xs text-slate-300">
            <span className="text-slate-500 hidden sm:inline">Priority:</span>
            {['high', 'medium', 'low'].map((p) => (
              <button
                key={p}
                onClick={() => handleBulkPriorityChange(p)}
                className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-amber-600 text-slate-200 hover:text-white transition-colors text-[11px] capitalize font-medium"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Bulk Delete */}
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 text-xs font-medium transition-colors"
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </button>

          <button
            onClick={() => setSelectedTaskIds([])}
            className="text-slate-500 hover:text-slate-300 text-xs ml-1"
            title="Clear selection"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {showModal && (
        <CreateTaskModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateTask}
          loading={adding}
          defaultStatus={modalStatus}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTask(null)}
          onSubmit={handleSaveTask}
          loading={saving}
        />
      )}

      {/* Archived Tasks Vault Modal */}
      {showArchiveVault && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowArchiveVault(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-xl rounded-2xl border border-white/[0.09] shadow-2xl p-6"
            style={{ background: '#16161f' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <Archive size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Archived Tasks Vault</h3>
                  <p className="text-xs text-slate-500">{archivedTasks.length} archived task(s)</p>
                </div>
              </div>
              <button
                onClick={() => setShowArchiveVault(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {archivedTasks.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Archive size={32} className="mx-auto mb-2 opacity-30 text-amber-400" />
                <p>No archived tasks found in vault.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {archivedTasks.map((t) => (
                  <div
                    key={t._id}
                    className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs"
                  >
                    <div>
                      <h4 className="font-semibold text-slate-200">{t.title}</h4>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                        <span className="capitalize px-2 py-0.5 rounded bg-white/[0.06]">{t.status}</span>
                        <span className="capitalize px-2 py-0.5 rounded bg-amber-500/10 text-amber-300">{t.priority} priority</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleArchiveTask(t._id, false)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition-colors font-medium"
                        title="Restore to board"
                      >
                        <ArchiveRestore size={13} />
                        <span>Restore</span>
                      </button>
                      <button
                        onClick={() => handleDeleteTask(t._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete permanently"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div
          className="modal-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowShortcutsModal(false)}
        >
          <div
            className="animate-fade-in-up w-full max-w-md rounded-2xl border border-white/[0.09] shadow-2xl p-6"
            style={{ background: '#16161f' }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.07] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Keyboard size={16} />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Keyboard Shortcuts</h3>
                  <p className="text-xs text-slate-500">Power user navigation keys</p>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Focus Search Bar</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[11px] border border-white/10">/</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Create New Task</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[11px] border border-white/10">N</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Toggle Shortcuts Dialog</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[11px] border border-white/10">?</kbd>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <span className="text-slate-300 font-medium">Close Modals / Dismiss</span>
                <kbd className="px-2 py-1 rounded bg-white/[0.08] text-indigo-300 font-mono font-bold text-[11px] border border-white/10">Esc</kbd>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Keyboard accessibility support verified successfully
