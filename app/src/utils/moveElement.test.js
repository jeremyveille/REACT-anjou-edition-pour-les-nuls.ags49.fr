import moveElement from './moveElement';

describe('moveElement utility tests', () => {
  const mockGenerator = (type) => ({
    id: `${type}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    settings: {},
    children: []
  });

  test('inserts a new section when dropped on canvas-root', () => {
    const initialTree = [];
    const updated = moveElement(initialTree, 'widget-section', 'canvas-root', true, mockGenerator);
    
    expect(updated.length).toBe(1);
    expect(updated[0].type).toBe('section');
  });

  test('auto-wraps a non-section widget in section->container->row->column when dropped on canvas-root', () => {
    const initialTree = [];
    const updated = moveElement(initialTree, 'widget-heading', 'canvas-root', true, mockGenerator);
    
    expect(updated.length).toBe(1);
    expect(updated[0].type).toBe('section');
    expect(updated[0].children[0].type).toBe('container');
    expect(updated[0].children[0].children[0].type).toBe('row');
    expect(updated[0].children[0].children[0].children[0].type).toBe('column');
    expect(updated[0].children[0].children[0].children[0].children[0].type).toBe('heading');
  });

  test('inserts a widget into an existing column', () => {
    const column = { id: 'col_1', type: 'column', settings: {}, children: [] };
    const row = { id: 'row_1', type: 'row', settings: {}, children: [column] };
    const container = { id: 'cont_1', type: 'container', settings: {}, children: [row] };
    const section = { id: 'sec_1', type: 'section', settings: {}, children: [container] };

    const initialTree = [section];
    const updated = moveElement(initialTree, 'widget-text', 'col_1', true, mockGenerator);

    const updatedCol = updated[0].children[0].children[0].children[0];
    expect(updatedCol.children.length).toBe(1);
    expect(updatedCol.children[0].type).toBe('text');
  });

  test('inserts a column into an existing row', () => {
    const row = { id: 'row_1', type: 'row', settings: {}, children: [] };
    const container = { id: 'cont_1', type: 'container', settings: {}, children: [row] };
    const section = { id: 'sec_1', type: 'section', settings: {}, children: [container] };

    const initialTree = [section];
    const updated = moveElement(initialTree, 'widget-column', 'row_1', true, mockGenerator);

    const updatedRow = updated[0].children[0].children[0];
    expect(updatedRow.children.length).toBe(1);
    expect(updatedRow.children[0].type).toBe('column');
  });

  test('inserts a row into an existing container', () => {
    const container = { id: 'cont_1', type: 'container', settings: {}, children: [] };
    const section = { id: 'sec_1', type: 'section', settings: {}, children: [container] };

    const initialTree = [section];
    const updated = moveElement(initialTree, 'widget-row', 'cont_1', true, mockGenerator);

    const updatedContainer = updated[0].children[0];
    expect(updatedContainer.children.length).toBe(1);
    expect(updatedContainer.children[0].type).toBe('row');
  });

  test('reorders an existing element next to another leaf element in a column', () => {
    const h1 = { id: 'h_1', type: 'heading', settings: {}, children: [] };
    const p1 = { id: 'p_1', type: 'text', settings: {}, children: [] };
    const column = { id: 'col_1', type: 'column', settings: {}, children: [h1, p1] };
    const row = { id: 'row_1', type: 'row', settings: {}, children: [column] };
    const container = { id: 'cont_1', type: 'container', settings: {}, children: [row] };
    const section = { id: 'sec_1', type: 'section', settings: {}, children: [container] };

    const initialTree = [section];
    const updated = moveElement(initialTree, 'widget-button', 'h_1', true, mockGenerator);

    const updatedCol = updated[0].children[0].children[0].children[0];
    expect(updatedCol.children.length).toBe(3);
    expect(updatedCol.children[0].id).toBe('h_1');
    expect(updatedCol.children[1].type).toBe('button');
    expect(updatedCol.children[2].id).toBe('p_1');
  });
});
