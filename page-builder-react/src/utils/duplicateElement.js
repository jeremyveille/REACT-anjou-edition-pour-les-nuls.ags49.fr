import generateId from './generateId';

/**
 * Recursively clones an element and assigns new unique IDs to it and all its children.
 * @param {object} element 
 * @returns {object} Cloned element
 */
function cloneElementWithNewIds(element) {
  const newId = generateId(element.type === 'row' ? 'row' : element.type === 'column' ? 'column' : element.type);
  return {
    ...element,
    id: newId,
    children: element.children ? element.children.map(cloneElementWithNewIds) : []
  };
}

/**
 * Duplicates an element by ID and inserts the copy next to the original in the tree.
 * @param {Array} elements 
 * @param {string} id 
 * @returns {Array} Updated elements tree
 */
export default function duplicateElement(elements, id) {
  // We can write a recursive helper to find and insert
  const recurse = (list) => {
    const idx = list.findIndex(el => el.id === id);
    if (idx !== -1) {
      const cloned = cloneElementWithNewIds(list[idx]);
      const newList = [...list];
      newList.splice(idx + 1, 0, cloned);
      return newList;
    }
    return list.map(el => {
      if (el.children && el.children.length > 0) {
        return {
          ...el,
          children: recurse(el.children)
        };
      }
      return el;
    });
  };

  return recurse(elements);
}
