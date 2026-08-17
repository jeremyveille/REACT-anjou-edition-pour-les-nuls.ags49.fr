import findElement from './findElement';
import createDefaultElement from './defaultElements';
import deleteElement from './deleteElement';

/**
 * Moves an element within the tree or inserts a new one.
 * @param {Array} elements - Tree of elements
 * @param {string} activeId - ID of dragged element (or widget type if new)
 * @param {string} overId - ID of element or container we dropped over
 * @param {boolean} isNew - Whether we are dropping a new widget from the sidebar
 * @returns {Array} Updated elements tree
 */
export default function moveElement(elements, activeId, overId, isNew = false, generateBlockFn = null) {
  let elementToInsert;
  let updatedTree = [...elements];

  const createNode = (type) => {
    return generateBlockFn ? generateBlockFn(type) : createDefaultElement(type);
  };

  if (isNew) {
    const type = activeId.replace('widget-', '');
    elementToInsert = createNode(type);
  } else {
    // Existing element: find and extract it
    const found = findElement(updatedTree, activeId);
    if (!found) return elements; // Not found, do nothing
    elementToInsert = found.element;
    updatedTree = deleteElement(updatedTree, activeId);
  }

  // Destination scenarios:
  // 1. Dropped on canvas root
  if (overId === 'canvas-root' || !overId) {
    // If it's a section or row, drop at root. Otherwise, wrap in section if empty,
    // or just append at the root. Sections are the top level structure.
    if (elementToInsert.type === 'section') {
      return [...updatedTree, elementToInsert];
    } else {
      // Autowrap non-sections: create a section, add element to a row/col
      const section = createNode('section');
      const container = createNode('container');
      const row = createNode('row');
      const column = createNode('column');
      row.children.push(column);
      container.children.push(row);
      section.children.push(container);
      
      column.children.push(elementToInsert);
      return [...updatedTree, section];
    }
  }

  // 2. Find target element/container
  const targetFound = findElement(updatedTree, overId);
  if (!targetFound) {
    // If overId is something else, just append to root
    return [...updatedTree, elementToInsert];
  }

  const { element: targetEl } = targetFound;

  // Scenario 2a: Target is a container that can hold children (section, column, or canvas-root)
  // Let's decide if we want to insert INTO the container, or NEXT TO the container.
  // - If dropping onto a SECTION:
  //   - If dragged is a ROW, we add it to the section's children.
  //   - If dragged is a WIDGET (text, image, etc.), we should probably add it to the first column of the first row inside the section. Or insert it into the section's children directly.
  // - If dropping onto a COLUMN:
  //   - We push it to the column's children.
  // - If dropping onto an ELEMENT (text, image, button, alert, card, etc.):
  //   - We insert it in the same parentList as the target element, at targetIdx + 1 or targetIdx.

  if (targetEl.type === 'column') {
    // Insert into the column
    const recurse = (list) => {
      return list.map(el => {
        if (el.id === overId) {
          return {
            ...el,
            children: [...el.children, elementToInsert]
          };
        }
        if (el.children && el.children.length > 0) {
          return {
            ...el,
            children: recurse(el.children)
          };
        }
        return el;
      });
    };
    return recurse(updatedTree);
  }

  if (targetEl.type === 'section') {
    // Insert row into section
    if (elementToInsert.type === 'row') {
      const recurse = (list) => {
        return list.map(el => {
          if (el.id === overId) {
            return {
              ...el,
              children: [...el.children, elementToInsert]
            };
          }
          if (el.children && el.children.length > 0) {
            return {
              ...el,
              children: recurse(el.children)
            };
          }
          return el;
        });
      };
      return recurse(updatedTree);
    } else if (elementToInsert.type === 'section') {
      // Insert section after target section
      const idx = updatedTree.findIndex(el => el.id === overId);
      if (idx !== -1) {
        const newList = [...updatedTree];
        newList.splice(idx + 1, 0, elementToInsert);
        return newList;
      }
    } else {
      // Dragged element is a widget (e.g. text), drop it into the section.
      // Ideally, the section has a row and a column. If not, create one.
      const recurse = (list) => {
        return list.map(el => {
          if (el.id === overId) {
            // Find or create a row -> column inside the section
            let sectionChildren = [...el.children];
            if (sectionChildren.length === 0) {
              const container = createNode('container');
              const row = createNode('row');
              const column = createNode('column');
              row.children.push(column);
              container.children.push(row);
              column.children.push(elementToInsert);
              sectionChildren.push(container);
            } else {
              // Try to put it in the last column of the last container -> row
              sectionChildren.push(elementToInsert);
            }
            return {
              ...el,
              children: sectionChildren
            };
          }
          if (el.children && el.children.length > 0) {
            return {
              ...el,
              children: recurse(el.children)
            };
          }
          return el;
        });
      };
      return recurse(updatedTree);
    }
  }

  // Scenario 2b: Target is a leaf element (text, image, button, card, video, alert, icon, etc.)
  // We insert elementToInsert in the same list as targetEl, right after (or at the index of) targetEl.
  const recurseInsertNextTo = (list) => {
    const idx = list.findIndex(el => el.id === overId);
    if (idx !== -1) {
      const newList = [...list];
      // If we are dropping a section or row, we shouldn't insert it inside a column list.
      // But let's keep it simple: insert it at the same hierarchy.
      newList.splice(idx + 1, 0, elementToInsert);
      return newList;
    }
    return list.map(el => {
      if (el.children && el.children.length > 0) {
        return {
          ...el,
          children: recurseInsertNextTo(el.children)
        };
      }
      return el;
    });
  };

  return recurseInsertNextTo(updatedTree);
}
