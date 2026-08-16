const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// ─── GET /api/comments/:entityType/:entityId ─────────────────────────────────
router.get('/:entityType/:entityId', auth, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { parentId, limit = 50, skip = 0 } = req.query;
    const query = { entityType, entityId, isDeleted: false };
    if (parentId === 'null' || !parentId) query.parentId = null;
    else query.parentId = parentId;

    const [comments, total] = await Promise.all([
      Comment.find(query)
        .sort({ isPinned: -1, createdAt: 1 })
        .skip(parseInt(skip))
        .limit(parseInt(limit))
        .populate('author', 'name email avatarColor')
        .populate('mentions', 'name email')
        .populate({ path: 'replyCount' })
        .lean({ virtuals: true }),
      Comment.countDocuments(query),
    ]);
    res.json({ comments, total, hasMore: parseInt(skip) + parseInt(limit) < total });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/comments ───────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { entityType, entityId, content, parentId } = req.body;
    if (!entityType || !entityId || !content?.trim()) {
      return res.status(400).json({ message: 'entityType, entityId, and content are required' });
    }
    // Parse @mentions from content
    const mentionIds = Comment.parseMentions(content);
    const comment = await Comment.create({
      entityType, entityId,
      content: content.trim(),
      rawContent: content,
      author: req.user.id,
      mentions: mentionIds,
      parentId: parentId || null,
    });
    const populated = await Comment.findById(comment._id)
      .populate('author', 'name email avatarColor')
      .populate('mentions', 'name email')
      .lean();

    // Notify mentioned users
    if (mentionIds.length > 0) {
      const notifs = mentionIds
        .filter(uid => uid.toString() !== req.user.id)
        .map(uid => ({
          user: uid,
          type: 'mention',
          title: 'You were mentioned in a comment',
          message: content.slice(0, 200),
          relatedEntity: { type: entityType, id: entityId },
        }));
      if (notifs.length > 0) await Notification.insertMany(notifs);
    }
    res.status(201).json({ comment: populated });
  } catch (err) {
    console.error('Comment create error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/comments/:id ────────────────────────────────────────────────────
router.put('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    // Save to edit history before updating
    comment.editHistory.push({ content: comment.content, editedBy: req.user.id });
    comment.content    = req.body.content.trim();
    comment.rawContent = req.body.content;
    comment.mentions   = Comment.parseMentions(req.body.content);
    await comment.save();
    const updated = await Comment.findById(req.params.id).populate('author', 'name email avatarColor').lean();
    res.json({ comment: updated });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── DELETE /api/comments/:id ─────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.content   = '[This comment was deleted]';
    await comment.save();
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── POST /api/comments/:id/react ────────────────────────────────────────────
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'emoji is required' });
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const existing = comment.reactions.find(r => r.emoji === emoji);
    if (existing) {
      const idx = existing.users.findIndex(u => u.toString() === req.user.id);
      if (idx >= 0) {
        existing.users.splice(idx, 1);
        existing.count = existing.users.length;
        if (existing.count === 0) {
          comment.reactions = comment.reactions.filter(r => r.emoji !== emoji);
        }
      } else {
        existing.users.push(req.user.id);
        existing.count++;
      }
    } else {
      comment.reactions.push({ emoji, users: [req.user.id], count: 1 });
    }
    await comment.save();
    res.json({ reactions: comment.reactions });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─── PUT /api/comments/:id/pin ────────────────────────────────────────────────
router.put('/:id/pin', auth, async (req, res) => {
  try {
    const comment = await Comment.findByIdAndUpdate(
      req.params.id, { isPinned: req.body.isPinned ?? true }, { new: true }
    );
    res.json({ comment });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
