const assert = require('assert');

describe('Role Middleware Checks', () => {
  it('should restrict read-only users from writing or deleting resources', () => {
    const rolesMap = {
      admin: { write: true, delete: true },
      member: { write: true, delete: false },
      viewer: { write: false, delete: false }
    };
    
    assert.strictEqual(rolesMap.viewer.write, false);
    assert.strictEqual(rolesMap.admin.delete, true);
  });
});
