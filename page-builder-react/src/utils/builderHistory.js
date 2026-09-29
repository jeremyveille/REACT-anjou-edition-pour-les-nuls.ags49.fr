const HISTORY_LIMIT = 50;
export const emptyHistory = { elements: [], past: [], future: [], pending: null };

// Pure transitions keep React StrictMode from duplicating history or storage writes.
export function builderHistory(state, action) {
  if (action.type === 'reset') return { ...emptyHistory, elements: action.elements };
  if (action.type === 'update') {
    const checkpoint = state.pending || state.elements;
    return {
      elements: action.elements,
      past: action.silent ? state.past : [...state.past, checkpoint].slice(-HISTORY_LIMIT),
      future: action.clearFuture === false ? state.future : [],
      pending: action.silent ? checkpoint : null,
    };
  }
  if (action.type === 'undo') {
    if (state.pending) return { ...state, elements: state.pending, pending: null, future: [state.elements, ...state.future] };
    if (!state.past.length) return state;
    return { elements: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.elements, ...state.future], pending: null };
  }
  if (action.type === 'redo') {
    if (!state.future.length) return state;
    return { elements: state.future[0], past: [...state.past, state.elements].slice(-HISTORY_LIMIT), future: state.future.slice(1), pending: null };
  }
  return state;
}
