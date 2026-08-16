const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Retrospective = require('../models/Retrospective');
const Sprint = require('../models/Sprint');

// ─── GET /api/retrospectives/sprint/:sprintId ────────────────────────────────
router.get('/sprint/:sprintId', auth, async (req, res) => {
  try {
    let retro = await Retrospective.findOne({ sprint: req.params.sprintId })
      .populate('facilitator', 'name avatarColor')
      .populate('wentWell.author', 'name avatarColor')
      .populate('improvements.author', 'name avatarColor')
      .populate('actionItems.owner', 'name avatarColor')
      .lean({ virtuals: true });
    if (!retro) {
      const sprint = await Sprint.findById(req.params.sprintId);
      if (!sprint) return res.status(404).json({ message: 'Sprint not found' });
      retro = await Retrospective.create({ sprint: req.params.sprintId, project: sprint.projectId, facilitator: req.user.id });
    }
    res.json({ retrospective: retro });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/retrospectives/sprint/:sprintId/item ─────────────────────────
// Add a went-well or improvement item
router.post('/sprint/:sprintId/item', auth, async (req, res) => {
  try {
    const { category, text } = req.body;
    if (!['wentWell', 'improvements'].includes(category)) return res.status(400).json({ message: 'Invalid category' });
    const retro = await Retrospective.findOne({ sprint: req.params.sprintId });
    if (!retro) return res.status(404).json({ message: 'Retrospective not found' });
    retro[category].push({ text: text.trim(), author: req.user.id });
    await retro.save();
    res.json({ retrospective: retro });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/retrospectives/sprint/:sprintId/vote ─────────────────────────
// Toggle vote on an item
router.post('/sprint/:sprintId/vote', auth, async (req, res) => {
  try {
    const { category, itemId } = req.body;
    const retro = await Retrospective.findOne({ sprint: req.params.sprintId });
    if (!retro) return res.status(404).json({ message: 'Retrospective not found' });
    const item = retro[category]?.id(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    const voteIdx = item.votes.findIndex(u => u.toString() === req.user.id);
    voteIdx >= 0 ? item.votes.splice(voteIdx, 1) : item.votes.push(req.user.id);
    await retro.save();
    res.json({ votes: item.votes.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/retrospectives/sprint/:sprintId/action ───────────────────────
router.post('/sprint/:sprintId/action', auth, async (req, res) => {
  try {
    const { title, ownerId, dueDate } = req.body;
    const retro = await Retrospective.findOne({ sprint: req.params.sprintId });
    if (!retro) return res.status(404).json({ message: 'Retrospective not found' });
    retro.actionItems.push({ title: title.trim(), owner: ownerId, dueDate });
    await retro.save();
    res.json({ actionItems: retro.actionItems });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/retrospectives/sprint/:sprintId/mood ─────────────────────────
router.post('/sprint/:sprintId/mood', auth, async (req, res) => {
  try {
    const { score } = req.body;
    if (!score || score < 1 || score > 5) return res.status(400).json({ message: 'Score must be 1-5' });
    const retro = await Retrospective.findOneAndUpdate(
      { sprint: req.params.sprintId },
      { $push: { moodScores: parseInt(score) } },
      { new: true }
    );
    res.json({ avgMood: retro.moodScores.reduce((a, b) => a + b, 0) / retro.moodScores.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/retrospectives/sprint/:sprintId ────────────────────────────────
router.put('/sprint/:sprintId', auth, async (req, res) => {
  try {
    const retro = await Retrospective.findOneAndUpdate({ sprint: req.params.sprintId }, req.body, { new: true });
    res.json({ retrospective: retro });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
