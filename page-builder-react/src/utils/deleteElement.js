/**
 * Deletes an element by ID from the nested elements tree.
 * @param {Array} elements 
 * @param {string} id 
 * @returns {Array} Updated elements tree
 */
export default function deleteElement(elements, id) {
  return elements
    .filter(el => el.id !== id)
    .map(el => {
      if (el.children && el.children.length > 0) {
        return {
          ...el,
          children: deleteElement(el.children, id)
        };
      }
      return el;
    });
}
