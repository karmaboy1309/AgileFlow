const assert = require('assert');

describe('JQL Syntax Validation Checks', () => {
  it('should parse simple fields, operators, and string values correctly', () => {
    const parseQuery = (query) => {
      const match = query.match(/^([a-zA-Z_]+)\s*(=|!=|IN)\s*(.+)$/);
      if (!match) return null;
      return { field: match[1], operator: match[2], value: match[3] };
    };
    
    const parsed = parseQuery('status = todo');
    assert.deepStrictEqual(parsed, { field: 'status', operator: '=', value: 'todo' });
  });
});
