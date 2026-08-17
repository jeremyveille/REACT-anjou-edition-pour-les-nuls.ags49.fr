/**
 * Finds an element by ID in a nested tree structure.
 * @param {Array} elements - Tree of elements
 * @param {string} id - The ID to look for
 * @returns {object|null} { element, parent, index } or null if not found
 */
export default function findElement(elements, id) {
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (el.id === id) {
      return { element: el, parent: null, index: i, parentList: elements };
    }
    if (el.children && el.children.length > 0) {
      const found = findElement(el.children, id);
      if (found) {
        return {
          element: found.element,
          parent: found.parent || el,
          index: found.index,
          parentList: found.parentList
        };
      }
    }
  }
  return null;
}
