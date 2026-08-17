const assert = require('assert');
const OKR = require('../models/OKR');
const ReleaseNote = require('../models/ReleaseNote');

describe('Models Validation Tests', () => {
  it('should calculate OKR progress correctly based on Key Results values', () => {
    const okr = new OKR({
      objective: 'Speed up API performance',
      keyResults: [
        { title: 'Reduce cycle time', metricType: 'number', startValue: 10, targetValue: 100, currentValue: 50 },
        { title: 'Increase uptime', metricType: 'percent', startValue: 90, targetValue: 100, currentValue: 100 }
      ]
    });

    const progress = okr.progress;
    // Expected: (50% + 100%) / 2 = 75%
    assert.strictEqual(progress, 75);
  });

  it('should count breaking changes inside Release Notes model correctly', () => {
    const rn = new ReleaseNote({
      versionName: 'v2.1.0',
      entries: [
        { title: 'New comments routing', category: 'feature', isBreaking: false },
        { title: 'Remove old attachments table', category: 'breaking', isBreaking: true }
      ]
    });

    const breakingCount = rn.breakingCount;
    assert.strictEqual(breakingCount, 1);
  });
});
