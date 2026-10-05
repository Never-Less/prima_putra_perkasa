const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/app/_lib/spreadsheet-controller.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} }; new Function('exports', 'require', 'module', compiled)(mod.exports, require, mod);
const { createSpreadsheetController } = mod.exports;
function fixture() {
  let selected = [0,0,0,0]; let rows = [{value:'A', source:'invoice-source'}, {value:'B'}];
  global.Node ||= class Node {};
  const root = new Node(); root.contains = () => true; root.addEventListener = (_type, handler) => { root.keydown = handler; }; root.removeEventListener = () => {};
  const worksheet = {
    options: { data: [['A'],['B']], columns:[{}], editable:true },
    getData() { return structuredClone(this.options.data); },
    setData(data) { this.options.data = structuredClone(data); this.history = []; },
    getSelection() { return selected; },
    updateSelectionFromCoords(...coords) { selected = coords; },
    insertRow(count,index,before) { this.options.data.splice(index + (before ? 0 : 1),0,['']); },
    deleteRow(index,count) { this.options.data.splice(index,count); },
    isReadOnly() { return false; },
    getValueFromCoords(x,y) { return this.options.data[y][x]; },
    setValue(changes) { changes.forEach(({x,y,value}) => this.options.data[y][x] = value); }
  };
  const controller = createSpreadsheetController({root,rows,toData: rows => rows.map(r=>[r.value]),
    fromData: (data,previous) => data.map(([value]) => ({...previous.find(r=>r.value===value),value})),
    onRowsChange: next => { rows=next; }, t:key=>key });
  controller.attach(worksheet);
  return {controller,worksheet,root,getRows:()=>rows};
}
test('undo delete restores invoice source metadata; redo deletes again',()=>{
  const {controller:c,worksheet:w,getRows}=fixture(); c.deleteRows(); c.undo();
  assert.equal(getRows()[0].source,'invoice-source'); assert.deepEqual(w.getData(),[['A'],['B']]);
  c.redo(); assert.deepEqual(w.getData(),[['B']]);
});
test('React echoes do not clear history and new edits discard redo',async()=>{
  const {controller:c,worksheet:w,getRows}=fixture(); w.options.data[0][0]='C';c.capture(); await Promise.resolve();
  c.replaceRows(getRows()); c.undo(); assert.equal(w.getData()[0][0],'A');
  w.options.data[0][0]='D';c.capture();await Promise.resolve();c.redo(); assert.equal(w.getData()[0][0],'D');
});
test('insert above/below can be undone and redone',()=>{
  const {controller:c,worksheet:w}=fixture(); c.insertAbove();c.undo();assert.equal(w.getData().length,2);
  c.redo();assert.deepEqual(w.getData(),[[''],['A'],['B']]);
  c.insertBelow();c.undo();assert.equal(w.getData().length,3);
});
test('paste events are grouped into one undo step',async()=>{
  const {controller:c,worksheet:w}=fixture();w.insertRow(1,1,0);c.capture();w.options.data[2][0]='paste';c.capture();
  await Promise.resolve();c.undo();assert.deepEqual(w.getData(),[['A'],['B']]);c.redo();assert.equal(w.getData()[2][0],'paste');
});
test('readonly blocks mutations and reset clears submitted draft history',()=>{
  const {controller:c,worksheet:w}=fixture();c.deleteRows();c.undo();w.options.editable=false;c.redo();c.insertAbove();c.deleteRows();
  assert.deepEqual(w.getData(),[['A'],['B']]);w.options.editable=true;c.resetRows([{value:''}]);c.undo();assert.deepEqual(w.getData(),[['']]);
});
test('fill down is one reversible operation',()=>{
  const {controller:c,worksheet:w}=fixture();w.updateSelectionFromCoords(0,0,0,1);c.fillDown();c.undo();
  assert.deepEqual(w.getData(),[['A'],['B']]);c.redo();assert.deepEqual(w.getData(),[['A'],['A']]);
});

test('Ctrl+Z / Ctrl+Y and Ctrl+Plus / Ctrl+Minus operate on selected rows',()=>{
  const {controller:c,worksheet:w,root}=fixture();
  function key(key,shiftKey=false) { let prevented=false;root.keydown({target:root,key,ctrlKey:true,shiftKey,preventDefault(){prevented=true;},stopImmediatePropagation(){}});assert.equal(prevented,true); }
  key('+');key('z');assert.equal(w.getData().length,2);key('y');assert.equal(w.getData().length,3);
  key('-');key('z');assert.equal(w.getData().length,3);key('z',true);assert.equal(w.getData().length,2);
});
test('shortcuts inside a cell editor are left to native text editing',()=>{
  const {worksheet:w,root}=fixture();w.edition=[{}];
  root.keydown({target:root,key:'z',ctrlKey:true,preventDefault(){assert.fail('text editor shortcut intercepted');}});
});
