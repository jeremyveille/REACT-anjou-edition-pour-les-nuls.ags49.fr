/**
 * Recursively updates an element's settings in the tree.
 * @param {Array} elements - Tree of elements
 * @param {string} id - Target element ID
 * @param {object} newSettings - New settings to merge
 * @returns {Array} New elements array (immutable update)
 */
export default function updateElement(elements, id, newSettings) {
  return elements.map(el => {
    if (el.id === id) {
      return {
        ...el,
        settings: {
          ...el.settings,
          ...newSettings
        }
      };
    }
    if (el.children && el.children.length > 0) {
      return {
        ...el,
        children: updateElement(el.children, id, newSettings)
      };
    }
    return el;
  });
}
