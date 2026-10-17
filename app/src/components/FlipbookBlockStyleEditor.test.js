import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FlipbookBlockStyleEditor from './FlipbookBlockStyleEditor';

describe('FlipbookBlockStyleEditor component', () => {
  const baseBlock = {
    id: 'block_test_1',
    type: 'text',
    title: 'Bloc littéraire',
    content: '<p>Extrait de lecture Anjou Édition.</p>',
    style: {
      borderWidth: 2,
      borderColor: '#cbd5e1',
      borderStyle: 'solid',
      borderRadius: 14,
      shadowEnabled: true,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      shadowBlur: 12,
      shadowSpread: -2,
      shadowOpacity: 10,
      shadowColor: '#0f172a',
      shadowInset: false
    }
  };

  test('renders Contour section with synchronized sliders and inputs', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Contour du bloc')).toBeInTheDocument();
    expect(screen.getByText(/Épaisseur du contour \(0 à 12 px\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Épaisseur du contour en pixels/i)).toHaveValue('2');
    expect(screen.getByLabelText(/Valeur numérique de l'épaisseur du contour/i)).toHaveValue(2);
    expect(screen.getByText(/Arrondi des angles \(0 à 40 px\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Curseur d'arrondi des angles en pixels/i)).toHaveValue('14');
  });

  test('calls onChange when changing border width slider', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={handleChange}
      />
    );

    const slider = screen.getByLabelText(/Épaisseur du contour en pixels/i);
    fireEvent.change(slider, { target: { value: '5' } });

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        borderWidth: 5
      })
    }));
  });

  test('switches to 4 separate border sides and allows individual adjustments', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="right"
        index={1}
        onChange={handleChange}
      />
    );

    const separateBtn = screen.getByRole('button', { name: /Définir séparément les quatre côtés du contour/i });
    fireEvent.click(separateBtn);

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        borderSidesUniform: false
      })
    }));
  });

  test('allows selecting border styles: solid, dotted, dashed, none', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={handleChange}
      />
    );

    const styleSelect = screen.getByLabelText(/Style du contour/i);
    expect(styleSelect).toHaveValue('solid');

    fireEvent.change(styleSelect, { target: { value: 'dashed' } });
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        borderStyle: 'dashed'
      })
    }));
  });

  test('renders Ombre section with active toggle and 4 presets', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={handleChange}
      />
    );

    expect(screen.getByText('Ombre du bloc')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Préréglage d'ombre : Aucune/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Préréglage d'ombre : Légère/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Préréglage d'ombre : Moyenne/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Préréglage d'ombre : Prononcée/i })).toBeInTheDocument();
  });

  test('applies shadow presets correctly', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={handleChange}
      />
    );

    const pronouncedBtn = screen.getByRole('button', { name: /Préréglage d'ombre : Prononcée/i });
    fireEvent.click(pronouncedBtn);

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        shadowEnabled: true,
        shadowBlur: 24,
        shadowSpread: -4,
        shadowOpacity: 18
      })
    }));

    const noneBtn = screen.getByRole('button', { name: /Préréglage d'ombre : Aucune/i });
    fireEvent.click(noneBtn);

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        shadowEnabled: false
      })
    }));
  });

  test('adjusts shadow offsets, blur, spread, opacity and inner inset', () => {
    const handleChange = jest.fn();
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={handleChange}
      />
    );

    const blurSlider = screen.getByLabelText(/Flou de l'ombre en pixels/i);
    fireEvent.change(blurSlider, { target: { value: '20' } });

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        shadowBlur: 20
      })
    }));

    const insetBtn = screen.getByRole('button', { name: /Ombre intérieure/i });
    fireEvent.click(insetBtn);

    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      style: expect.objectContaining({
        shadowInset: true
      })
    }));
  });

  test('renders live immediate preview with calculated CSS box', () => {
    render(
      <FlipbookBlockStyleEditor
        block={baseBlock}
        position="left"
        index={0}
        onChange={jest.fn()}
      />
    );

    expect(screen.getByText('Aperçu immédiat du bloc')).toBeInTheDocument();
    expect(screen.getByText(/Extrait de lecture Anjou Édition/i)).toBeInTheDocument();
    expect(screen.getByText(/box-shadow:/i)).toBeInTheDocument();
    expect(screen.getByText(/border:/i)).toBeInTheDocument();
  });
});
