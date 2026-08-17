const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ReleaseNote = require('../models/ReleaseNote');

// Helper to convert release notes object into markdown format
function generateMarkdownChangelog(rn) {
  let md = `# Release Notes - ${rn.versionName}\n\n`;
  if (rn.summary) md += `${rn.summary}\n\n`;
  
  const categories = {
    feature: '🚀 New Features',
    improvement: '✨ Improvements',
    bug_fix: '🐛 Bug Fixes',
    breaking: '💥 Breaking Changes',
    security: '🛡️ Security Updates',
    performance: '⚡ Performance Optimizations',
  };
  
  const entriesByCat = rn.entriesByCategory || {};
  
  Object.entries(categories).forEach(([key, title]) => {
    const list = entriesByCat[key] || [];
    if (list.length > 0) {
      md += `## ${title}\n\n`;
      list.forEach(e => {
        md += `- **${e.title}**${e.description ? `: ${e.description}` : ''}`;
        if (e.isBreaking) md += ` *(BREAKING)*`;
        if (e.externalLink) md += ` ([Ref](${e.externalLink}))`;
        md += '\n';
      });
      md += '\n';
    }
  });
  
  if (rn.migrationGuide) {
    md += `## ⚠️ Migration Guide\n\n${rn.migrationGuide}\n`;
  }
  
  return md;
}

// GET /api/release-notes/:projectId
router.get('/:projectId', auth, async (req, res) => {
  try {
    const notes = await ReleaseNote.find({ project: req.params.projectId })
      .populate('version')
      .sort({ createdAt: -1 })
      .lean({ virtuals: true });
    res.json({ releaseNotes: notes });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/release-notes
router.post('/', auth, async (req, res) => {
  try {
    const { version, project, versionName, summary, entries, migrationGuide, status, slug } = req.body;
    if (!version || !project || !versionName) {
      return res.status(400).json({ message: 'version, project, and versionName are required' });
    }
    
    const rn = new ReleaseNote({
      version, project, versionName, summary,
      entries: entries || [], migrationGuide, status: status || 'draft',
      slug, publishedBy: req.user.id,
    });
    
    rn.markdownCache = generateMarkdownChangelog(rn);
    await rn.save();
    
    res.status(201).json({ releaseNote: rn });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Release notes already exist for this version' });
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/release-notes/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const rn = await ReleaseNote.findById(req.params.id);
    if (!rn) return res.status(404).json({ message: 'Release note not found' });
    
    Object.assign(rn, req.body);
    rn.markdownCache = generateMarkdownChangelog(rn);
    if (req.body.status === 'published' && !rn.publishedAt) {
      rn.publishedAt = new Date();
    }
    
    await rn.save();
    res.json({ releaseNote: rn });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/release-notes/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    await ReleaseNote.findByIdAndDelete(req.params.id);
    res.json({ message: 'Release note deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
