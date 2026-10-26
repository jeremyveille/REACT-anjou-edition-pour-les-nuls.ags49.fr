import { 
  BRAND_HEADER, 
  BRAND_NAME, 
  BRAND_NAME_CAPITALIZED, 
  BRAND_NAME_UPPERCASE,
  sanitizeBrandName,
  formatBrandName
} from './brand';

describe('Constantes officielles de marque et règles de nommage', () => {
  test('R1: Respecte strictement l\'exception du header principal "Anjou Édition"', () => {
    expect(BRAND_HEADER).toBe('Anjou Édition');
  });

  test('R1: Définit la marque harmonisée "Anjou Édition, pour les nuls" pour tout le reste du site et du dashboard', () => {
    expect(BRAND_NAME).toBe('Anjou Édition, pour les nuls');
    expect(BRAND_NAME_CAPITALIZED).toBe('Anjou Édition, Pour les Nuls');
    expect(BRAND_NAME_UPPERCASE).toBe('ANJOU ÉDITION, POUR LES NULS');
  });

  test('R1: sanitizeBrandName élimine toute duplication syntaxique de type "pour les nuls, pour les nuls"', () => {
    expect(sanitizeBrandName('Anjou Édition, pour les nuls, pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Édition pour les nuls, pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Édition, pour les nuls. Pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Édition, pour les nuls — pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Édition, pour les nuls, pour les nuls, pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Edition pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Édition : pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('Anjou Edition - pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(sanitizeBrandName('')).toBe('');
    expect(sanitizeBrandName(null)).toBe('');
  });

  test('formatBrandName normalise correctement les entrées diverses', () => {
    expect(formatBrandName('Anjou Édition')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName('Anjou Edition')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName('Anjou Édition.')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName('Anjou Édition, pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName('Anjou Edition pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName('Anjou Édition, pour les nuls, pour les nuls')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName('Autre Titre Personnalisé')).toBe('Autre Titre Personnalisé');
    expect(formatBrandName('')).toBe('Anjou Édition, pour les nuls');
    expect(formatBrandName(null)).toBe('Anjou Édition, pour les nuls');
  });
});
