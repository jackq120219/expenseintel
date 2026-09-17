'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {compareScopes}=require('../lib/deep-check-scope');
test('flags only noted asymmetries and does not assert exclusions',()=>{
  const results=compareScopes([{name:'A',scope:'Installation and permits included; 10 year warranty.'},{name:'B',scope:'Installation included and standard labor.'}]);
  assert.ok(results.some(x=>x.includes('Permits')&&x.includes('A')&&x.includes('B')));
  assert.ok(results.some(x=>x.includes('Warranty')));
  assert.ok(results.every(x=>!x.includes('is excluded')));
});
test('explains that matching keywords cannot prove scope parity',()=>{
  const results=compareScopes([{name:'A',scope:'Installation included'},{name:'B',scope:'Installation included'}]);
  assert.match(results[0],/does not establish/);
});
test('requires both scopes to compare',()=>{
  assert.match(compareScopes([{name:'A',scope:'warranty'},{name:'B',scope:''}])[0],/Enter both/);
});
