import {
  clamp,
  hexToRgba,
  parseRadiusNumber,
  normalizeBlockStyle,
  computeBoxShadowCss,
  computeBorderCssProperties,
  computeBlockCustomStyles,
  applyStyleToAllBlocks,
  SHADOW_PRESETS,
  BORDER_STYLES
} from './flipbookBlockStyleUtils';

describe('flipbookBlockStyleUtils', () => {
  describe('clamp', () => {
    test('clamps values within min and max', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp('invalid', 0, 10, 3)).toBe(3);
    });
  });

  describe('hexToRgba', () => {
    test('converts 6-digit hex and opacity percent to rgba', () => {
      expect(hexToRgba('#000000', 50)).toBe('rgba(0, 0, 0, 0.50)');
      expect(hexToRgba('#ffffff', 100)).toBe('rgba(255, 255, 255, 1.00)');
      expect(hexToRgba('#0f172a', 10)).toBe('rgba(15, 23, 42, 0.10)');
    });

    test('handles 3-digit hex format correctly', () => {
      expect(hexToRgba('#fff', 80)).toBe('rgba(255, 255, 255, 0.80)');
    });

    test('handles fallback on invalid hex', () => {
      expect(hexToRgba('invalid', 20)).toBe('rgba(15, 23, 42, 0.20)');
    });
  });

  describe('parseRadiusNumber', () => {
    test('parses numbers and strings correctly', () => {
      expect(parseRadiusNumber(25)).toBe(25);
      expect(parseRadiusNumber('18px')).toBe(18);
      expect(parseRadiusNumber('none')).toBe(0);
      expect(parseRadiusNumber('rounded')).toBe(8);
      expect(parseRadiusNumber('normal')).toBe(14);
      expect(parseRadiusNumber('pill')).toBe(20);
      expect(parseRadiusNumber(50)).toBe(40); // clamped to 40 max
      expect(parseRadiusNumber(-5)).toBe(0); // clamped to 0 min
    });
  });

  describe('computeBorderCssProperties', () => {
    test('removes border visually when borderWidth is 0 px', () => {
      const result = computeBorderCssProperties({
        borderWidth: 0,
        borderSidesUniform: true,
        borderColor: '#cbd5e1'
      });
      expect(result.border).toBe('none');
      expect(result.borderWidth).toBe('0px');
      expect(result.borderStyle).toBe('none');
    });

    test('removes border when borderStyle is "none"', () => {
      const result = computeBorderCssProperties({
        borderWidth: 3,
        borderStyle: 'none'
      });
      expect(result.border).toBe('none');
      expect(result.borderStyle).toBe('none');
    });

    test('computes uniform border correctly for 0 to 12 px', () => {
      const result = computeBorderCssProperties({
        borderWidth: 4,
        borderStyle: 'dashed',
        borderColor: '#1e3a8a',
        borderRadius: 16
      });
      expect(result.borderWidth).toBe('4px');
      expect(result.borderStyle).toBe('dashed');
      expect(result.borderColor).toBe('#1e3a8a');
      expect(result.borderRadius).toBe('16px');
    });

    test('supports setting separate borders for the 4 sides', () => {
      const result = computeBorderCssProperties({
        borderSidesUniform: false,
        borderTopWidth: 4,
        borderRightWidth: 0,
        borderBottomWidth: 2,
        borderLeftWidth: 1,
        borderStyle: 'solid',
        borderColor: '#2563eb'
      });
      expect(result.borderTopWidth).toBe('4px');
      expect(result.borderRightWidth).toBe('0px');
      expect(result.borderBottomWidth).toBe('2px');
      expect(result.borderLeftWidth).toBe('1px');
      expect(result.borderStyle).toBe('solid');
      expect(result.borderColor).toBe('#2563eb');
    });

    test('removes border when all 4 sides are set to 0 px', () => {
      const result = computeBorderCssProperties({
        borderSidesUniform: false,
        borderTopWidth: 0,
        borderRightWidth: 0,
        borderBottomWidth: 0,
        borderLeftWidth: 0
      });
      expect(result.border).toBe('none');
      expect(result.borderWidth).toBe('0px');
      expect(result.borderStyle).toBe('none');
    });
  });

  describe('computeBoxShadowCss', () => {
    test('returns "none" when shadow is disabled', () => {
      const css = computeBoxShadowCss({ shadowEnabled: false });
      expect(css).toBe('none');
    });

    test('computes outer box-shadow with offset, blur, spread and color opacity', () => {
      const css = computeBoxShadowCss({
        shadowEnabled: true,
        shadowOffsetX: 2,
        shadowOffsetY: 6,
        shadowBlur: 14,
        shadowSpread: -3,
        shadowOpacity: 12,
        shadowColor: '#004b7a',
        shadowInset: false
      });
      expect(css).toContain('2px 6px 14px -3px');
      expect(css).toContain('rgba(0, 75, 122, 0.12)');
      expect(css).not.toContain('inset');
    });

    test('computes inner (inset) shadow correctly', () => {
      const css = computeBoxShadowCss({
        shadowEnabled: true,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowSpread: 1,
        shadowOpacity: 15,
        shadowColor: '#0f172a',
        shadowInset: true
      });
      expect(css.startsWith('inset')).toBe(true);
      expect(css).toContain('inset 0px 2px 8px 1px');
    });
  });

  describe('computeBlockCustomStyles', () => {
    test('integrates both borders and shadows into custom style object', () => {
      const block = {
        type: 'text',
        style: {
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: '#e2e8f0',
          borderRadius: 12,
          shadowEnabled: true,
          shadowOffsetX: 0,
          shadowOffsetY: 4,
          shadowBlur: 10,
          shadowSpread: -2,
          shadowOpacity: 8,
          shadowColor: '#0f172a'
        }
      };

      const style = computeBlockCustomStyles(block);
      expect(style.borderWidth).toBe('2px');
      expect(style.borderStyle).toBe('solid');
      expect(style.borderColor).toBe('#e2e8f0');
      expect(style.borderRadius).toBe('12px');
      expect(style.boxShadow).toContain('0px 4px 10px -2px');
    });

    test('preserves backward compatibility with legacy blocks', () => {
      const legacyBlock = {
        type: 'heading',
        backgroundColor: '#f8fafc',
        textColor: '#1e3a8a',
        borderColor: '#cbd5e1',
        borderRadius: 'rounded',
        shadow: 'subtle',
        textAlign: 'center'
      };

      const style = computeBlockCustomStyles(legacyBlock);
      expect(style.backgroundColor).toBe('#f8fafc');
      expect(style.color).toBe('#1e3a8a');
      expect(style.borderColor).toBe('#cbd5e1');
      expect(style.borderRadius).toBe('8px');
      expect(style.boxShadow).toBe('0 1px 3px rgba(15, 23, 42, 0.05)');
      expect(style.textAlign).toBe('center');
    });
  });

  describe('applyStyleToAllBlocks', () => {
    test('propagates border and shadow styles across all blocks homogeneously', () => {
      const blocks = [
        { id: 'b1', type: 'text', title: 'Bloc 1', style: { borderWidth: 1 } },
        { id: 'b2', type: 'image', title: 'Bloc 2', style: { borderWidth: 0 } }
      ];

      const globalStyle = {
        borderWidth: 4,
        borderColor: '#1e3a8a',
        borderStyle: 'dashed',
        borderRadius: 20,
        shadowEnabled: true,
        shadowBlur: 14
      };

      const updated = applyStyleToAllBlocks(blocks, globalStyle);
      expect(updated).toHaveLength(2);
      expect(updated[0].style.borderWidth).toBe(4);
      expect(updated[0].style.borderColor).toBe('#1e3a8a');
      expect(updated[0].style.borderStyle).toBe('dashed');
      expect(updated[0].style.borderRadius).toBe(20);
      expect(updated[0].style.shadowBlur).toBe(14);

      expect(updated[1].style.borderWidth).toBe(4);
      expect(updated[1].style.borderColor).toBe('#1e3a8a');
      expect(updated[1].style.borderStyle).toBe('dashed');
      expect(updated[1].style.borderRadius).toBe(20);
      expect(updated[1].style.shadowBlur).toBe(14);
    });
  });
});

