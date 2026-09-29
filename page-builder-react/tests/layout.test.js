/* eslint-env node */
import test from 'node:test';
import assert from 'node:assert/strict';
import validateLayout from '../src/utils/validateLayout.js';
import importJson from '../src/utils/importJson.js';
import { serializeLayout } from '../src/utils/exportJson.js';
import renderHtml from '../src/utils/renderHtml.js';
import { TEMPLATES } from '../src/data/templates.js';
import { builderHistory, emptyHistory } from '../src/utils/builderHistory.js';

const block = (id = 'text-1', type = 'text', settings = {}) => ({ id, type, settings, children: [] });

test('all shipped templates retain their nested content and settings through JSON export/import', () => {
  for (const template of TEMPLATES) {
    const original = template.build();
    assert.deepEqual(validateLayout(JSON.parse(serializeLayout(original))), original, template.name);
  }
});

test('invalid documents, unknown blocks and duplicate nested ids are rejected atomically', () => {
  const current = [block('work', 'text', { content: 'Travail conservé' })];
  const original = serializeLayout(current);
  const invalidLayouts = [
    {}, null, 'hello', [null], [block('', 'text')], [block('x', 'unknown')],
    [{ ...block('x'), settings: [] }], [{ ...block('x'), children: {} }],
    [{ ...block('x', 'section'), children: [block('x')] }],
    [{ ...block('x'), children: [block('y')] }],
    [block('x', 'text', { content: { invalid: true } })],
  ];
  for (const invalid of invalidLayouts) {
    let state = current;
    assert.throws(() => { state = validateLayout(invalid); });
    assert.equal(state, current);
    assert.equal(serializeLayout(state), original);
  }
});

test('oversized or excessively nested trees are rejected before rendering', () => {
  assert.throws(() => validateLayout(Array.from({ length: 10001 }, (_, i) => block(`item-${i}`))), /trop de blocs/);
  const root = block('root', 'section');
  let child = root;
  for (let i = 0; i < 51; i++) {
    child.children = [block(`nested-${i}`, 'section')];
    child = child.children[0];
  }
  assert.throws(() => validateLayout([root]), /trop de niveaux/);
});

test('file import exposes invalid JSON and schema errors and accepts an empty layout intentionally', async t => {
  const originalReader = globalThis.FileReader;
  globalThis.FileReader = class {
    readAsText(file) { this.onload({ target: { result: file.text } }); }
  };
  t.after(() => { if (originalReader) globalThis.FileReader = originalReader; else delete globalThis.FileReader; });
  const file = text => ({ name: 'layout.JSON', type: '', text });
  await assert.rejects(importJson(file('{')), /JSON valide/);
  await assert.rejects(importJson(file('{}')), /tableau de blocs/);
  await assert.rejects(importJson(file(JSON.stringify([block('dup'), block('dup')]))), /dupliqué/);
  await assert.rejects(importJson({ name: 'layout.txt', type: 'text/plain' }), /fichier JSON valide/);
  await assert.rejects(importJson(null), /Aucun fichier/);
  assert.deepEqual(await importJson(file('[]')), []);
});

test('a failed file read never resolves a replacement layout', async t => {
  const originalReader = globalThis.FileReader;
  globalThis.FileReader = class { readAsText() { this.onerror(); } };
  t.after(() => { if (originalReader) globalThis.FileReader = originalReader; else delete globalThis.FileReader; });
  await assert.rejects(importJson({ name: 'page.json', type: 'application/json' }), /Erreur de lecture/);
});

for (const type of ['section', 'hero', 'row', 'column', 'spacer', 'separator', 'text', 'image', 'video', 'button', 'icon', 'card', 'alert', 'testimonial', 'cta']) {
  test(`${type}: exported gradient, shadow and visibility belong to the element itself`, () => {
    const html = renderHtml([block('one', type, {
      gradientFrom: '#112233', gradientTo: '#445566', gradientDir: 'to right',
      boxShadow: '0 4px 16px #0003', hideMobile: true, hideTablet: true,
    })]);
    const opening = html.match(/^<[^>]+>/)[0];
    const display = ['row', 'hero'].includes(type) ? 'flex' : (['image', 'icon'].includes(type) ? 'inline-block' : 'block');
    assert.match(opening, /background: linear-gradient\(to right, #112233, #445566\)/);
    assert.match(opening, /box-shadow: 0 4px 16px #0003/);
    assert.ok(opening.includes(`d-none d-md-none d-lg-${display}`));
    if (type === 'section') assert.match(opening, /^<section/);
    if (type === 'image') assert.match(opening, /^<img/);
  });
}

test('advanced settings do not insert wrappers between rows and columns', () => {
  const row = block('row', 'row', { hideTablet: true });
  row.children = [block('column', 'column', { className: 'col-md-6', gradientFrom: 'red', gradientTo: 'blue' })];
  const html = renderHtml([row]);
  assert.match(html, /^<div class="row[^\n]*d-flex d-md-none d-lg-flex[^\n]*>\n {2}<div class="col-md-6"/);
  assert.equal((html.match(/<div/g) || []).length, 2);
});

test('gradients export without visibility flags and zero values and numeric styles survive', () => {
  const html = renderHtml([
    block('hero', 'hero', { backgroundColor: 'red', gradientFrom: 'blue', gradientTo: 'green', title: 'Titre' }),
    block('text', 'text', { fontWeight: 700, fontSize: '20px', content: 'Texte' }),
    block('spacer', 'spacer', { height: 0 }),
  ]);
  assert.match(html, /background-color: red[^\n]+background: linear-gradient\(to bottom, blue, green\)/);
  assert.match(html, /font-weight: 700/);
  assert.match(html, /height: 0px/);
});

test('export escapes attributes, restricts text tags and rejects unsafe link schemes', () => {
  const html = renderHtml([
    block('link', 'button', { href: 'java\nscript:alert(1)', target: '_blank', text: 'Lien' }),
    block('text', 'text', { tag: 'script', content: 'Texte' }),
    block('card', 'card', { margin: '" onmouseover="alert(1)' }),
  ]);
  assert.match(html, /href="#" target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<script/);
  assert.doesNotMatch(html, /" onmouseover="/);
  assert.match(html, /&quot;/);
});

test('undo restores an imported document and redo restores the imported tree', () => {
  const original = [block('original')];
  const imported = validateLayout([block('new', 'hero', { title: 'Nouveau' })]);
  const start = builderHistory(emptyHistory, { type: 'reset', elements: original });
  const changed = builderHistory(start, { type: 'update', elements: imported });
  const undone = builderHistory(changed, { type: 'undo' });
  assert.deepEqual(undone.elements, original);
  assert.deepEqual(builderHistory(undone, { type: 'redo' }).elements, imported);
  assert.deepEqual(start, { ...emptyHistory, elements: original });
});

test('typing checkpoints preserve the text before editing and a new edit clears redo', () => {
  const original = [block('text', 'text', { content: 'Avant' })];
  let history = builderHistory(emptyHistory, { type: 'reset', elements: original });
  for (const content of ['A', 'Après']) {
    history = builderHistory(history, { type: 'update', silent: true, elements: [block('text', 'text', { content })] });
  }
  history = builderHistory(history, { type: 'update', elements: history.elements });
  history = builderHistory(history, { type: 'undo' });
  assert.deepEqual(history.elements, original);
  history = builderHistory(history, { type: 'update', elements: [block('new')] });
  assert.equal(history.future.length, 0);
});

test('history remains bounded to fifty reversible operations', () => {
  let history = emptyHistory;
  for (let i = 0; i < 75; i++) history = builderHistory(history, { type: 'update', elements: [block(`${i}`)] });
  assert.equal(history.past.length, 50);
  for (let i = 0; i < 50; i++) history = builderHistory(history, { type: 'undo' });
  assert.equal(history.elements[0].id, '24');
});
