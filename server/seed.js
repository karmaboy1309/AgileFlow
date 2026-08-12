'use strict';

const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Epic = require('./models/Epic');
const Task = require('./models/Task');
const Sprint = require('./models/Sprint');
const Release = require('./models/Release');
const Version = require('./models/Version');
const Component = require('./models/Component');
const SavedFilter = require('./models/SavedFilter');
const Gadget = require('./models/Gadget');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const Worklog = require('./models/Worklog');
const ProjectRole = require('./models/ProjectRole');
const IssueLink = require('./models/IssueLink');
const ApiKey = require('./models/ApiKey');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/agileflow';

async function seed() {
  try {
    console.log(`🔌 Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB.');

    // ─── 1. Clear Existing Data ───────────────────────────────────────────────
    console.log('🧹 Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Epic.deleteMany({}),
      Task.deleteMany({}),
      Sprint.deleteMany({}),
      Release.deleteMany({}),
      Version.deleteMany({}),
      Component.deleteMany({}),
      SavedFilter.deleteMany({}),
      Gadget.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
      Worklog.deleteMany({}),
      ProjectRole.deleteMany({}),
      IssueLink.deleteMany({}),
      ApiKey.deleteMany({}),
    ]);
    console.log('✅ Collections cleared.');

    // ─── 2. Seed Users ────────────────────────────────────────────────────────
    console.log('👥 Seeding users...');
    const usersData = [
      {
        name: 'Demo Admin',
        email: 'demo@agileflow.com',
        password: 'password123',
        role: 'Workspace Administrator',
        avatarColor: '#6366f1',
        bio: 'Managing AgileFlow core workspace and team assignments.',
      },
      {
        name: 'Jane Doe',
        email: 'jane@agileflow.com',
        password: 'password123',
        role: 'Product Owner',
        avatarColor: '#ec4899',
        bio: 'Defining user stories, roadmap goals, and managing product backlog.',
      },
      {
        name: 'John Smith',
        email: 'john@agileflow.com',
        password: 'password123',
        role: 'Scrum Master',
        avatarColor: '#10b981',
        bio: 'Facilitating sprints, daily standups, and removing development blockers.',
      },
      {
        name: 'Alice Johnson',
        email: 'alice@agileflow.com',
        password: 'password123',
        role: 'Lead Developer',
        avatarColor: '#f59e0b',
        bio: 'Designing technical architecture and implementing critical system features.',
      },
    ];

    const users = [];
    for (const u of usersData) {
      const user = await User.create(u);
      users.push(user);
    }
    const admin = users[0];
    const jane = users[1];
    const john = users[2];
    const alice = users[3];
    console.log(`✅ Seeded ${users.length} users successfully.`);

    // ─── 3. Seed Projects ─────────────────────────────────────────────────────
    console.log('📁 Seeding projects...');
    const project = await Project.create({
      name: 'Phoenix Platform',
      key: 'PHX',
      description: 'Next-generation enterprise platform for scalable workflows and analytics.',
      lead: admin._id,
      category: 'Software',
      createdBy: admin._id,
      statuses: [
        { id: 'todo', label: 'To Do', category: 'todo' },
        { id: 'in-progress', label: 'In Progress', category: 'in-progress' },
        { id: 'done', label: 'Done', category: 'done' },
      ],
      seq: 7, // Auto-increment index set to 7 since we seed 7 tasks
    });

    // Assign roles in ProjectRole
    await Promise.all([
      ProjectRole.create({ projectId: project._id, userId: admin._id, role: 'Admin', createdBy: admin._id }),
      ProjectRole.create({ projectId: project._id, userId: jane._id, role: 'Member', createdBy: admin._id }),
      ProjectRole.create({ projectId: project._id, userId: john._id, role: 'Member', createdBy: admin._id }),
      ProjectRole.create({ projectId: project._id, userId: alice._id, role: 'Member', createdBy: admin._id }),
    ]);

    console.log(`✅ Seeded project "${project.name}" [${project.key}].`);

    // ─── 4. Seed Epics ────────────────────────────────────────────────────────
    console.log('📊 Seeding epics...');
    const epicsData = [
      {
        title: 'User Authentication & Security',
        description: 'Implement JWT authorization, secure password hashing, and user-role access control.',
        color: '#6366f1', // Indigo
        status: 'completed',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
      },
      {
        title: 'Interactive Kanban Board',
        description: 'Build a drag-and-drop workspace with customizable columns, card sorting, and subtask tracking.',
        color: '#10b981', // Emerald
        status: 'active',
        startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
      },
      {
        title: 'Agile Reporting & Dashboards',
        description: 'Develop Sprint Burndown charts, Velocity trackers, and CFD reports for project progress visualization.',
        color: '#f59e0b', // Amber
        status: 'active',
        startDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdBy: admin._id,
      },
      {
        title: 'Mobile Application Client',
        description: 'Design and prototype responsive iOS & Android companion applications for on-the-go task management.',
        color: '#ec4899', // Pink
        status: 'on-hold',
        startDate: null,
        targetDate: null,
        createdBy: admin._id,
      },
    ];

    const epics = await Epic.create(epicsData);
    console.log(`✅ Seeded ${epics.length} epics.`);

    // ─── 5. Seed Sprints ──────────────────────────────────────────────────────
    console.log('🏃 Seeding sprints...');
    const sprint1 = await Sprint.create({
      name: 'PHX Sprint 1: Security & Auth',
      goal: 'Secure authorization flow, user role middleware, and profile management.',
      startDate: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      status: 'closed',
      projectId: project._id,
      createdBy: admin._id,
    });

    const sprint2 = await Sprint.create({
      name: 'PHX Sprint 2: Kanban & DnD',
      goal: 'Complete hello-pangea/dnd board integration, columns, and task sorting features.',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'active',
      projectId: project._id,
      createdBy: admin._id,
    });

    const sprint3 = await Sprint.create({
      name: 'PHX Sprint 3: Reporting & Polish',
      goal: 'Deliver high-quality burndown chart, workload analytics, and finalize system lints.',
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      status: 'draft',
      projectId: project._id,
      createdBy: admin._id,
    });
    console.log('✅ Seeded 3 sprints (1 closed, 1 active, 1 draft).');

    // ─── 6. Seed Releases / Fix Versions ──────────────────────────────────────
    console.log('🚀 Seeding releases...');
    const releaseBeta = await Release.create({
      name: 'v1.0.0-beta',
      description: 'Initial beta release containing security modules and core board structure.',
      projectId: project._id,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      releaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'Released',
      user: admin._id,
    });

    const releaseStable = await Release.create({
      name: 'v1.0.0',
      description: 'Production stable release with full agile reports suite and dashboards.',
      projectId: project._id,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      releaseDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'Unreleased',
      user: admin._id,
    });

    // Also populate Version schema for double-definition safety
    const verBeta = await Version.create({
      name: 'v1.0.0-beta',
      description: 'Initial beta release containing security modules and core board structure.',
      projectId: project._id,
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      releaseDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'released',
      createdBy: admin._id,
    });

    const verStable = await Version.create({
      name: 'v1.0.0',
      description: 'Production stable release with full agile reports suite and dashboards.',
      projectId: project._id,
      startDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      releaseDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'unreleased',
      createdBy: admin._id,
    });
    console.log('✅ Seeded releases successfully.');

    // ─── 7. Seed Components ───────────────────────────────────────────────────
    console.log('🔌 Seeding components...');
    const componentsData = [
      { name: 'Frontend', description: 'React and Tailwind CSS user interface layers.', projectId: project._id, createdBy: admin._id },
      { name: 'Backend', description: 'Express endpoints, controller actions, and services.', projectId: project._id, createdBy: admin._id },
      { name: 'Database', description: 'MongoDB collection schemas and Mongoose aggregates.', projectId: project._id, createdBy: admin._id },
      { name: 'Security', description: 'Authentication gates, token generation, and password hashing.', projectId: project._id, createdBy: admin._id },
    ];
    const components = await Component.create(componentsData);
    console.log(`✅ Seeded ${components.length} components.`);

    // ─── 8. Seed Tasks ────────────────────────────────────────────────────────
    console.log('📋 Seeding tasks...');
    const tasksData = [
      {
        title: 'Setup Mongoose schemas and password hashing',
        description: 'Define user model, register pre-save password hashing hooks with bcrypt, and enforce validation rules.',
        issueType: 'task',
        issueKey: 'PHX-1',
        projectId: project._id,
        status: 'done',
        priority: 'high',
        assignee: alice.email,
        epicId: epics[0]._id, // Security
        sprintId: sprint1._id, // Sprint 1
        dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Create User schema', completed: true },
          { title: 'Implement bcrypt salt pre-save hooks', completed: true },
          { title: 'Write schema tests', completed: true },
        ],
        tags: ['Database', 'Backend', 'Security'],
        fixVersionId: releaseBeta._id,
        componentIds: [components[1]._id, components[2]._id, components[3]._id], // Backend, Database, Security
        storyPoints: 5,
        originalEstimateHours: 12,
        estimatedHours: 12,
        remainingEstimateHours: 0,
        loggedHours: 12,
        orderIndex: 0,
        workLogs: [
          { userId: alice._id, userName: alice.name, timeSpentHours: 8, comment: 'Schemas and validation rules fully defined.', dateLogged: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
          { userId: alice._id, userName: alice.name, timeSpentHours: 4, comment: 'Bcrypt hook tested and working correctly.', dateLogged: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },
        ],
        comments: [
          { text: 'Great structure. Make sure salt rounds matches 12 for compliance.', author: 'John Smith', createdAt: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000) },
          { text: 'Adjusted to 12. Validations also prevent timing attacks.', author: 'Alice Johnson', createdAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000) },
        ],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: alice.name, createdAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000) },
          { action: 'status_change', field: 'status', from: 'todo', to: 'in-progress', actor: alice.name, createdAt: new Date(Date.now() - 18 * 24 * 60 * 60 * 1000) },
          { action: 'status_change', field: 'status', from: 'in-progress', to: 'done', actor: alice.name, createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        title: 'Implement JWT token generation and authentication guards',
        description: 'Configure secret-based JWT signing, token extraction middleware, and route protection checks.',
        issueType: 'story',
        issueKey: 'PHX-2',
        projectId: project._id,
        status: 'done',
        priority: 'high',
        assignee: admin.email,
        epicId: epics[0]._id, // Security
        sprintId: sprint1._id, // Sprint 1
        dueDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Write Auth Guard middleware', completed: true },
          { title: 'Add JWT extraction from Headers', completed: true },
          { title: 'Test endpoints with Postman', completed: true },
        ],
        tags: ['Security', 'Backend'],
        fixVersionId: releaseBeta._id,
        componentIds: [components[1]._id, components[3]._id], // Backend, Security
        storyPoints: 5,
        originalEstimateHours: 10,
        estimatedHours: 10,
        remainingEstimateHours: 0,
        loggedHours: 10,
        orderIndex: 1,
        workLogs: [
          { userId: admin._id, userName: admin.name, timeSpentHours: 10, comment: 'JWT middleware created and unit-tested.', dateLogged: new Date(Date.now() - 11 * 24 * 60 * 60 * 1000) },
        ],
        comments: [
          { text: 'Please ensure MONGODB_URI falls back cleanly if server starts offline.', author: 'Alice Johnson', createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
        ],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: admin.name, createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          { action: 'status_change', field: 'status', from: 'todo', to: 'done', actor: admin.name, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        title: 'Integrate @hello-pangea/dnd for fluid card movements',
        description: 'Setup drag-and-drop context, columns, drag handlers, and optimistic local state updates on drop.',
        issueType: 'story',
        issueKey: 'PHX-3',
        projectId: project._id,
        status: 'in-progress',
        priority: 'high',
        assignee: admin.email,
        epicId: epics[1]._id, // Kanban
        sprintId: sprint2._id, // Sprint 2 (Active)
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Install pangea-dnd package', completed: true },
          { title: 'Create columns wrapper component', completed: true },
          { title: 'Persist new orderIndex via API endpoint', completed: false },
        ],
        tags: ['Frontend', 'Kanban'],
        fixVersionId: releaseBeta._id,
        componentIds: [components[0]._id], // Frontend
        storyPoints: 8,
        originalEstimateHours: 20,
        estimatedHours: 20,
        remainingEstimateHours: 8,
        loggedHours: 12,
        orderIndex: 0,
        workLogs: [
          { userId: admin._id, userName: admin.name, timeSpentHours: 12, comment: 'Drag handlers initialized, visual column drop indicators working.', dateLogged: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
        comments: [
          { text: 'Optimistic UI update works great, card doesnt flicker.', author: 'John Smith', createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: admin.name, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { action: 'status_change', field: 'status', from: 'todo', to: 'in-progress', actor: admin.name, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        title: 'Bug: Column cards overlap on smaller screen widths',
        description: 'Cards list overflows columns when resizing browser window. Need responsive CSS flex wrap or media queries.',
        issueType: 'bug',
        issueKey: 'PHX-4',
        projectId: project._id,
        status: 'todo',
        priority: 'medium',
        assignee: john.email,
        epicId: epics[1]._id, // Kanban
        sprintId: sprint2._id, // Sprint 2 (Active)
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Locate styling file with overlap error', completed: false },
          { title: 'Add flex wrap configuration', completed: false },
        ],
        tags: ['Frontend', 'Bugfix'],
        fixVersionId: releaseBeta._id,
        componentIds: [components[0]._id], // Frontend
        storyPoints: 3,
        originalEstimateHours: 6,
        estimatedHours: 6,
        remainingEstimateHours: 6,
        loggedHours: 0,
        orderIndex: 0,
        workLogs: [],
        comments: [],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: john.name, createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        title: 'Create Sprint Burndown charts with Recharts',
        description: 'Query sprint data, compute remaining story points daily, and render visual progress line graph using Recharts.',
        issueType: 'story',
        issueKey: 'PHX-5',
        projectId: project._id,
        status: 'todo',
        priority: 'high',
        assignee: alice.email,
        epicId: epics[2]._id, // Reporting
        sprintId: sprint3._id, // Sprint 3 (Draft)
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Install recharts package', completed: false },
          { title: 'Write daily points computation pipeline', completed: false },
          { title: 'Add burndown line chart frontend page', completed: false },
        ],
        tags: ['Frontend', 'Backend', 'Reporting'],
        fixVersionId: releaseStable._id,
        componentIds: [components[0]._id, components[1]._id], // Frontend, Backend
        storyPoints: 8,
        originalEstimateHours: 16,
        estimatedHours: 16,
        remainingEstimateHours: 16,
        loggedHours: 0,
        orderIndex: 0,
        workLogs: [],
        comments: [],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: alice.name, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        title: 'Add CFD (Cumulative Flow Diagram) aggregation pipelines',
        description: 'Write Mongo aggregation query to group tasks by status changes over historical dates for CFD reports.',
        issueType: 'task',
        issueKey: 'PHX-6',
        projectId: project._id,
        status: 'todo',
        priority: 'medium',
        assignee: john.email,
        epicId: epics[2]._id, // Reporting
        sprintId: sprint3._id, // Sprint 3 (Draft)
        dueDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Formulate Mongo aggregate pipeline query', completed: false },
          { title: 'Map status changes with timestamp array', completed: false },
        ],
        tags: ['Backend', 'Database', 'Reporting'],
        fixVersionId: releaseStable._id,
        componentIds: [components[1]._id, components[2]._id], // Backend, Database
        storyPoints: 5,
        originalEstimateHours: 12,
        estimatedHours: 12,
        remainingEstimateHours: 12,
        loggedHours: 0,
        orderIndex: 1,
        workLogs: [],
        comments: [],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: john.name, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
        ],
      },
      {
        title: 'Design iOS app wireframes and navigation flow',
        description: 'Mockup mobile screens: Dashboard overview, Epic Kanban board, and Task details modal for responsive mobile workflow.',
        issueType: 'task',
        issueKey: 'PHX-7',
        projectId: project._id,
        status: 'todo',
        priority: 'low',
        assignee: jane.email,
        epicId: epics[3]._id, // Mobile
        sprintId: null, // Backlog task
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        subtasks: [
          { title: 'Create mobile dashboard figma mockups', completed: false },
          { title: 'Map out mobile task detail screen actions', completed: false },
        ],
        tags: ['Mobile', 'UI-Design'],
        fixVersionId: null,
        componentIds: [],
        storyPoints: 5,
        originalEstimateHours: 15,
        estimatedHours: 15,
        remainingEstimateHours: 15,
        loggedHours: 0,
        orderIndex: 0,
        workLogs: [],
        comments: [],
        activityLog: [
          { action: 'created', field: null, from: null, to: null, actor: jane.name, createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) },
        ],
      },
    ];

    const tasks = [];
    for (const t of tasksData) {
      const task = await Task.create(t);
      tasks.push(task);
    }
    console.log(`✅ Seeded ${tasks.length} tasks successfully.`);

    // ─── 9. Create Issue Links ────────────────────────────────────────────────
    console.log('🔗 Seeding issue links...');
    await IssueLink.create({
      sourceTaskId: tasks[2]._id, // PHX-3 (Integrate hello-pangea/dnd)
      targetTaskId: tasks[3]._id, // PHX-4 (Cards overlap bug)
      relationship: 'blocks',
      createdBy: admin._id,
    });
    // Update the task inline dependencies to display it in the UI as well
    tasks[2].issueLinks.push({ relationship: 'blocks', targetTaskId: tasks[3]._id });
    await tasks[2].save();
    tasks[3].issueLinks.push({ relationship: 'is_blocked_by', targetTaskId: tasks[2]._id });
    await tasks[3].save();
    console.log('✅ Seeded issue links and updated tasks.');

    // ─── 10. Seed Dashboard Gadgets ───────────────────────────────────────────
    console.log('🖥️ Seeding gadgets...');
    await Promise.all([
      Gadget.create({ title: 'My Work Queue', gadgetType: 'assigned_issues', config: { showCompleted: false }, orderIndex: 0, createdBy: admin._id }),
      Gadget.create({ title: 'Phoenix Platform Summary', gadgetType: 'project_summary', config: { projectId: project._id }, orderIndex: 1, createdBy: admin._id }),
      Gadget.create({ title: 'Sprint Velocity History', gadgetType: 'velocity_chart', config: { projectId: project._id }, orderIndex: 2, createdBy: admin._id }),
    ]);
    console.log('✅ Seeded dashboard gadgets.');

    // ─── 11. Seed Saved Filters ───────────────────────────────────────────────
    console.log('🔍 Seeding JQL saved filters...');
    await Promise.all([
      SavedFilter.create({ name: 'Active Bugs', jql: 'type = bug AND status != done', description: 'Lists all open defects across the project.', isFavorite: true, createdBy: admin._id }),
      SavedFilter.create({ name: 'High Priority Backlog', jql: 'priority = high AND sprint = null', description: 'Surfaces items in the backlog requiring immediate planning.', isFavorite: false, createdBy: admin._id }),
      SavedFilter.create({ name: 'My In-Progress Items', jql: 'assignee = currentUser() AND status = "in-progress"', description: 'Tracks work I am currently doing.', isFavorite: true, createdBy: admin._id }),
    ]);
    console.log('✅ Seeded filters.');

    // ─── 12. Seed Notifications ──────────────────────────────────────────────
    console.log('🔔 Seeding initial notifications...');
    await Promise.all([
      Notification.create({ recipient: admin._id, sender: alice._id, type: 'comment', taskId: tasks[0]._id, message: 'Alice Johnson left a comment on PHX-1: schemas and bcrypt password hook resolved.', isRead: false }),
      Notification.create({ recipient: admin._id, sender: jane._id, type: 'mention', taskId: tasks[6]._id, message: 'Jane Doe mentioned you on PHX-7: Requesting input on mobile dashboard wireframes.', isRead: false }),
      Notification.create({ recipient: admin._id, sender: john._id, type: 'assigned', taskId: tasks[2]._id, message: 'John Smith assigned PHX-3 Kanban Board integration to you.', isRead: true }),
    ]);
    console.log('✅ Seeded notifications.');

    // ─── 13. Seed Audit Logs ──────────────────────────────────────────────────
    console.log('📋 Seeding system audit logs...');
    await Promise.all([
      AuditLog.create({ action: 'project_created', targetType: 'Project', targetId: project._id.toString(), actor: 'Demo Admin', details: { name: 'Phoenix Platform', key: 'PHX' } }),
      AuditLog.create({ action: 'user_registered', targetType: 'User', targetId: alice._id.toString(), actor: 'System', details: { email: 'alice@agileflow.com' } }),
      AuditLog.create({ action: 'sprint_started', targetType: 'Sprint', targetId: sprint2._id.toString(), actor: 'John Smith', details: { name: 'PHX Sprint 2: Kanban & DnD' } }),
    ]);
    console.log('✅ Seeded audit logs.');

    console.log('\n🌟 Database seeding completed successfully! 🌟');
    console.log('\n--- Login Credentials ---');
    console.log('Email: demo@agileflow.com');
    console.log('Password: password123');
    console.log('-------------------------\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB.');
  }
}

seed();
