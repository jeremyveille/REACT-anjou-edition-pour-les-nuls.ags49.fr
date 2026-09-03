import { renderHook, act } from '@testing-library/react';
import { usePageBuilderHistory } from './usePageBuilderHistory';

describe('usePageBuilderHistory hook tests', () => {
  test('initializes with default empty array', () => {
    const { result } = renderHook(() => usePageBuilderHistory());
    expect(result.current.state).toEqual([]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  test('pushes new states and enables undo', () => {
    const { result } = renderHook(() => usePageBuilderHistory([{ id: '1', type: 'section' }]));
    
    act(() => {
      result.current.push([{ id: '1', type: 'section' }, { id: '2', type: 'heading' }]);
    });

    expect(result.current.state.length).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  test('handles undo and redo properly', () => {
    const state1 = [{ id: '1' }];
    const state2 = [{ id: '1' }, { id: '2' }];
    const state3 = [{ id: '1' }, { id: '2' }, { id: '3' }];

    const { result } = renderHook(() => usePageBuilderHistory(state1));

    act(() => {
      result.current.push(state2);
    });
    act(() => {
      result.current.push(state3);
    });

    expect(result.current.state.length).toBe(3);

    // Undo 1
    act(() => {
      result.current.undo();
    });
    expect(result.current.state.length).toBe(2);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(true);

    // Undo 2
    act(() => {
      result.current.undo();
    });
    expect(result.current.state.length).toBe(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);

    // Redo 1
    act(() => {
      result.current.redo();
    });
    expect(result.current.state.length).toBe(2);
  });

  test('caps history length to maxHistory', () => {
    const { result } = renderHook(() => usePageBuilderHistory([], 5));

    for (let i = 1; i <= 10; i++) {
      act(() => {
        result.current.push([{ id: `block_${i}` }]);
      });
    }

    // Should not exceed maxHistory (5)
    expect(result.current.state[0].id).toBe('block_10');
  });

  test('clears history to new state', () => {
    const { result } = renderHook(() => usePageBuilderHistory([{ id: '1' }]));

    act(() => {
      result.current.push([{ id: '1' }, { id: '2' }]);
    });
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.clear([{ id: 'fresh' }]);
    });

    expect(result.current.state).toEqual([{ id: 'fresh' }]);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });
});
