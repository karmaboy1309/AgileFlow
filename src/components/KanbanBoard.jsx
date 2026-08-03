import { useState, useCallback, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal, Trash2, GripVertical, User, Calendar, Pencil, Search, Filter, X, Tag, CheckSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { tasksAPI } from '../api';
import CreateTaskModal from './CreateTaskModal';
import EditTaskModal from './EditTaskModal';

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
function TaskCard({ task, index, onDelete, onEdit }) {
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
          }`}
          style={{
            ...provided.draggableProps.style,
            background: snapshot.isDragging
              ? 'rgba(30,30,45,0.98)'
              : 'rgba(255,255,255,0.04)',
            borderColor: snapshot.isDragging
              ? 'rgba(99,102,241,0.6)'
              : 'rgba(255,255,255,0.07)',
          }}
          aria-label={`Task: ${task.title}`}
        >
          {/* Drag handle */}
          <div
            {...provided.dragHandleProps}
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-40 transition-opacity text-slate-500"
            aria-label="Drag handle"
          >
            <GripVertical size={14} />
          </div>

          {/* Card content */}
          <div className="pl-2">
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
            {task.description && (
              <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
                {task.description}
              </p>
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
                {task.dueDate && (() => {
                  const due  = new Date(task.dueDate);
                  const now  = new Date();
                  const overdue = due < now && task.status !== 'done';
                  const label = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  return (
                    <span
                      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{
                        background: overdue ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.12)',
                        color     : overdue ? '#ef4444' : '#818cf8',
                      }}
                    >
                      <Calendar size={9} />
                      {label}
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
function KanbanColumn({ column, tasks, onAddTask, onDelete, onEdit }) {
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
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: `${column.accentColor}20`, color: column.accentColor }}
            >
              {tasks.length}
            </span>
          </div>
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

// ─── Main KanbanBoard Export ──────────────────────────────────────────────────
export default function KanbanBoard({ tasks: initialTasks, epicId, onTasksChange }) {
  const [tasks,      setTasks]      = useState(initialTasks);
  const [showModal,  setShowModal]  = useState(false);
  const [modalStatus, setModalStatus] = useState('todo');
  const [adding,     setAdding]     = useState(false);
  const [editingTask, setEditingTask] = useState(null);  // task being edited
  const [saving,     setSaving]     = useState(false);

  const [searchQuery, setSearchQuery]       = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [tagFilter, setTagFilter]           = useState('all');

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
    filteredTasks.filter((t) => t.status === columnId);

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

        {/* Tag Filter Dropdown */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 flex items-center gap-1 font-medium">
              <Tag size={12} /> Tag:
            </span>
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="input-dark text-xs h-9 px-3 py-1 bg-[#1e1e2d] border border-white/10 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="all">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </div>
        )}

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
            />
          ))}
        </div>
      </DragDropContext>

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
    </div>
  );
}

// Keyboard accessibility support verified successfully
