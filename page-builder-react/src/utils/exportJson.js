/**
 * Exports elements tree to a JSON file and triggers browser download.
 * @param {Array} elements 
 * @param {string} fileName 
 */
export default function exportJson(elements, fileName = 'page-builder-layout.json') {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(elements, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", fileName);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
