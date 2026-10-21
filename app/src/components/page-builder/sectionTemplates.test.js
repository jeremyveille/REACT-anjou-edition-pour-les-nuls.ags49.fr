import { 
  SECTION_TEMPLATES, 
  SECTION_TEMPLATE_CATEGORIES,
  instantiateSectionTemplate,
  getSectionTemplateById,
  getSectionTemplatesByCategory
} from './sectionTemplates';
import { 
  ANJOU_EDITION_PALETTE, 
  DEFAULT_EXTENDED_STYLE,
  DEFAULT_RESPONSIVE_FLAGS,
  createBlock, 
  normalizeBlocks, 
  cloneBlock 
} from './blockRegistry';

describe('Jalon M1 — Validation de sectionTemplates.js et des extensions de blockRegistry.js', () => {

  // ========================================================================
  // 1. Tests unitaires pour sectionTemplates.js
  // ========================================================================

  test('TEST-M1-T1 : SECTION_TEMPLATES expose au moins 6 modèles structurels valides et complets', () => {
    expect(Array.isArray(SECTION_TEMPLATES)).toBe(true);
    expect(SECTION_TEMPLATES.length).toBeGreaterThanOrEqual(6);

    const seenIds = new Set();
    const expectedModelIds = [
      'hero_centered',
      'two_columns_media',
      'three_cards_grid',
      'cta_banner',
      'literary_quote',
      'faq_section'
    ];

    // Vérification de la présence des identifiants requis
    const templateIds = SECTION_TEMPLATES.map(t => t.id);
    expectedModelIds.forEach(expectedId => {
      expect(templateIds).toContain(expectedId);
    });

    SECTION_TEMPLATES.forEach(template => {
      // 1. Clés obligatoires
      expect(typeof template.id).toBe('string');
      expect(template.id.trim().length).toBeGreaterThan(0);
      expect(typeof template.name).toBe('string');
      expect(template.name.trim().length).toBeGreaterThan(0);
      expect(typeof template.description).toBe('string');
      expect(template.description.trim().length).toBeGreaterThan(0);
      expect(template.icon).toBeDefined();
      expect(typeof template.category).toBe('string');

      // 2. Unicité des IDs
      expect(seenIds.has(template.id)).toBe(false);
      seenIds.add(template.id);

      // 3. Blocs valides
      expect(Array.isArray(template.blocks)).toBe(true);
      expect(template.blocks.length).toBeGreaterThan(0);

      // Le bloc racine doit être une structure (section ou container)
      const rootBlock = template.blocks[0];
      expect(['section', 'container']).toContain(rootBlock.type);
      expect(rootBlock.id).toBeDefined();
    });
  });

  test('TEST-M1-T2 : Règle Fondamentale d\'Identité — Zéro contenu historique, patrimonial ou touristique auto-généré', () => {
    // Liste de mots-clés régionaux/historiques formellement proscrits dans les modèles auto-générés
    const forbiddenPatterns = [
      /château/i,
      /duc\s+d['’]anjou/i,
      /tapisserie/i,
      /apocalypse/i,
      /roi\s+rené/i,
      /foulques?\s+nerra/i,
      /plantevaresse/i,
      /cointreau/i,
      /doué-en-anjou/i,
      /terra\s+botanica/i,
      /patrimoine\s+historique/i,
      /guide\s+touristique/i,
      /forteresse\s+médiévale/i,
      /vignoble/i,
      /saumur/i,
      /layon/i,
      /maine-et-loire/i
    ];

    const inspectTextRecursively = (obj) => {
      if (!obj) return;
      if (typeof obj === 'string') {
        forbiddenPatterns.forEach(pattern => {
          expect(obj).not.toMatch(pattern);
        });
      } else if (Array.isArray(obj)) {
        obj.forEach(inspectTextRecursively);
      } else if (typeof obj === 'object') {
        Object.values(obj).forEach(inspectTextRecursively);
      }
    };

    SECTION_TEMPLATES.forEach(template => {
      inspectTextRecursively(template.name);
      inspectTextRecursively(template.description);
      inspectTextRecursively(template.blocks);
    });
  });

  test('TEST-M1-T3 : instantiateSectionTemplate génère de nouveaux identifiants uniques récursivement', () => {
    const templateId = 'hero_centered';
    const originalTemplate = SECTION_TEMPLATES.find(t => t.id === templateId);
    expect(originalTemplate).toBeDefined();

    const instance1 = instantiateSectionTemplate(templateId);
    const instance2 = instantiateSectionTemplate(templateId);

    expect(Array.isArray(instance1)).toBe(true);
    expect(instance1.length).toBe(originalTemplate.blocks.length);

    // Vérifier que les IDs de l'instance 1 sont différents de l'original
    expect(instance1[0].id).not.toBe(originalTemplate.blocks[0].id);

    // Vérifier que deux instanciations successives génèrent des IDs différents
    expect(instance1[0].id).not.toBe(instance2[0].id);

    // Vérifier la récursion sur les enfants (container, row, column, heading...)
    const collectIds = (blocks) => {
      let ids = [];
      blocks.forEach(b => {
        ids.push(b.id);
        if (Array.isArray(b.children)) {
          ids = ids.concat(collectIds(b.children));
        }
      });
      return ids;
    };

    const idsInstance1 = collectIds(instance1);
    const idsInstance2 = collectIds(instance2);

    expect(idsInstance1.length).toBeGreaterThan(1);
    expect(idsInstance2.length).toBe(idsInstance1.length);

    // Tous les IDs générés dans une même instance doivent être uniques
    const uniqueIds1 = new Set(idsInstance1);
    expect(uniqueIds1.size).toBe(idsInstance1.length);

    // Aucun ID de l'instance 1 ne doit être présent dans l'instance 2
    idsInstance1.forEach(id => {
      expect(idsInstance2).not.toContain(id);
    });
  });

  test('TEST-M1-T4 : instantiateSectionTemplate prend en charge les alias et gère les identifiants invalides sans exception', () => {
    // 1. Support des alias kebab-case
    const byAlias1 = instantiateSectionTemplate('hero-intro');
    expect(byAlias1.length).toBe(1);
    expect(byAlias1[0].type).toBe('section');

    const byAlias2 = instantiateSectionTemplate('two-columns-media');
    expect(byAlias2.length).toBe(1);

    const byAlias3 = instantiateSectionTemplate('three-cards-grid');
    expect(byAlias3.length).toBe(1);

    const byAlias4 = instantiateSectionTemplate('cta-centered');
    expect(byAlias4.length).toBe(1);

    const byAlias5 = instantiateSectionTemplate('quote-divider');
    expect(byAlias5.length).toBe(1);

    const byAlias6 = instantiateSectionTemplate('faq-accordion');
    expect(byAlias6.length).toBe(1);

    // 2. Gestion propre des entrées invalides ou inexistantes
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(instantiateSectionTemplate('modele-inconnu-12345')).toEqual([]);
    expect(instantiateSectionTemplate(null)).toEqual([]);
    expect(instantiateSectionTemplate(undefined)).toEqual([]);
    expect(instantiateSectionTemplate('')).toEqual([]);
    consoleSpy.mockRestore();
  });

  test('TEST-M1-T5 : instantiateSectionTemplate supporte une fonction de clonage personnalisée', () => {
    const customClone = jest.fn((block) => ({
      ...block,
      id: `custom_${block.type}_test_id`
    }));

    const result = instantiateSectionTemplate('two_columns_media', customClone);
    expect(customClone).toHaveBeenCalled();
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].id).toBe('custom_section_test_id');
  });

  test('TEST-M1-T6 : getSectionTemplateById et getSectionTemplatesByCategory fonctionnent fidèlement', () => {
    // Recherche par ID direct
    const hero = getSectionTemplateById('hero_centered');
    expect(hero).toBeDefined();
    expect(hero.id).toBe('hero_centered');

    // Recherche par alias
    const heroByAlias = getSectionTemplateById('hero-intro');
    expect(heroByAlias).toBeDefined();
    expect(heroByAlias.id).toBe('hero_centered');

    // ID inconnu
    expect(getSectionTemplateById('inconnu_xyz')).toBeNull();
    expect(getSectionTemplateById(null)).toBeNull();

    // Filtrage par catégorie
    const all = getSectionTemplatesByCategory('all');
    expect(all.length).toBe(SECTION_TEMPLATES.length);

    const heroTemplates = getSectionTemplatesByCategory('hero');
    expect(heroTemplates.length).toBeGreaterThanOrEqual(1);
    expect(heroTemplates.every(t => t.category === 'hero')).toBe(true);

    const unknownCat = getSectionTemplatesByCategory('categorie_inexistante');
    expect(unknownCat).toEqual([]);

    // Couverture des catégories
    const categoryIds = SECTION_TEMPLATE_CATEGORIES.map(c => c.id);
    SECTION_TEMPLATES.forEach(t => {
      expect(categoryIds).toContain(t.category);
    });
  });

  // ========================================================================
  // 2. Tests unitaires pour blockRegistry.js (Palette, Styles & Responsive)
  // ========================================================================

  test('TEST-M1-T7 : ANJOU_EDITION_PALETTE expose exactement 17 nuances officielles cohérentes avec contraste certifié', () => {
    expect(Array.isArray(ANJOU_EDITION_PALETTE)).toBe(true);
    expect(ANJOU_EDITION_PALETTE.length).toBe(17);

    const hexColorRegex = /^#([0-9a-fA-F]{6})$/;
    const values = new Set();

    ANJOU_EDITION_PALETTE.forEach(color => {
      expect(typeof color.label).toBe('string');
      expect(color.label.trim().length).toBeGreaterThan(0);
      expect(color.value).toMatch(hexColorRegex);
      expect(color.textColor).toMatch(hexColorRegex);
      expect(values.has(color.value.toLowerCase())).toBe(false);
      values.add(color.value.toLowerCase());
    });

    // Vérification des nuances emblématiques indispensables
    const hexList = ANJOU_EDITION_PALETTE.map(c => c.value.toLowerCase());
    expect(hexList).toContain('#1e3a8a'); // Bleu Royal (Principal)
    expect(hexList).toContain('#0f2b5c'); // Bleu Nuit Éditorial
    expect(hexList).toContain('#004b7a'); // Bleu Ardoise Dashboard
    expect(hexList).toContain('#2563eb'); // Bleu Royal Vif
    expect(hexList).toContain('#0284c7'); // Bleu Ciel Loire
    expect(hexList).toContain('#f0f7ff'); // Bleu Givré Doux
    expect(hexList).toContain('#d97706'); // Or Chaud Angevin
    expect(hexList).toContain('#fef3c7'); // Or Doux Pastel
    expect(hexList).toContain('#059669'); // Vert Loire Végétal
    expect(hexList).toContain('#ecfdf5'); // Vert Givré
    expect(hexList).toContain('#7c3aed'); // Pourpre Éditorial
    expect(hexList).toContain('#e11d48'); // Rose Pivoine
    expect(hexList).toContain('#fdfbf7'); // Crème Papier Vélin
    expect(hexList).toContain('#ffffff'); // Blanc Pur
    expect(hexList).toContain('#f8fafc'); // Ardoise Claire
    expect(hexList).toContain('#1e293b'); // Ardoise Sombre
    expect(hexList).toContain('#0f172a'); // Noir Ébène Texte
  });

  test('TEST-M1-T8 : DEFAULT_EXTENDED_STYLE et DEFAULT_RESPONSIVE_FLAGS sont exportés avec structure conforme', () => {
    expect(DEFAULT_EXTENDED_STYLE).toBeDefined();
    expect(DEFAULT_EXTENDED_STYLE.borderStyle).toBe('none');
    expect(DEFAULT_EXTENDED_STYLE).toHaveProperty('paddingTop');
    expect(DEFAULT_EXTENDED_STYLE).toHaveProperty('paddingBottom');
    expect(DEFAULT_EXTENDED_STYLE).toHaveProperty('borderRadius');
    expect(DEFAULT_EXTENDED_STYLE).toHaveProperty('boxShadow');
    expect(DEFAULT_EXTENDED_STYLE).toHaveProperty('backgroundColor');
    expect(DEFAULT_EXTENDED_STYLE).toHaveProperty('color');

    expect(DEFAULT_RESPONSIVE_FLAGS).toEqual({
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false
    });
  });

  test('TEST-M1-T9 : createBlock et normalizeBlocks initialisent et préservent les styles étendus et drapeaux responsive', () => {
    // 1. Initialisation par défaut avec createBlock
    const section = createBlock('section');
    expect(section.settings.hideOnMobile).toBe(false);
    expect(section.settings.hideOnTablet).toBe(false);
    expect(section.settings.hideOnDesktop).toBe(false);
    expect(section.settings.hidden).toBe(false);
    expect(section.hidden).toBe(false);
    expect(section.settings.style.backgroundColor).toBe('#ffffff');
    expect(section.settings.style.paddingTop).toBe('2rem');

    // 2. Initialisation avec des réglages personnalisés (deep merge de style)
    const customSection = createBlock('section', {
      hideOnMobile: true,
      hideOnDesktop: true,
      hidden: true,
      style: {
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#1e3a8a'
      }
    });
    expect(customSection.settings.hideOnMobile).toBe(true);
    expect(customSection.settings.hideOnTablet).toBe(false);
    expect(customSection.settings.hideOnDesktop).toBe(true);
    expect(customSection.settings.hidden).toBe(true);
    expect(customSection.hidden).toBe(true);
    expect(customSection.settings.style.backgroundColor).toBe('#ffffff'); // Préservé
    expect(customSection.settings.style.paddingTop).toBe('2rem');         // Préservé
    expect(customSection.settings.style.borderRadius).toBe('12px');       // Ajouté
    expect(customSection.settings.style.boxShadow).toBe('0 4px 12px rgba(0,0,0,0.1)'); // Ajouté
    expect(customSection.settings.style.color).toBe('#1e3a8a');           // Ajouté

    // 3. Normalisation d'un arbre incomplet / hérité sans drapeaux responsive
    const legacyTree = [
      {
        id: 'sec_legacy_1',
        type: 'section',
        settings: {
          style: {
            paddingBottom: '4rem',
            borderWidth: '2px',
            borderColor: '#1e3a8a'
          },
          hideOnTablet: true
        },
        children: [
          {
            id: 'btn_legacy_1',
            type: 'button',
            settings: { text: 'Cliquez ici' }
          }
        ]
      },
      {
        type: 'heading',
        settings: {
          content: 'Titre Sans Style'
        }
      }
    ];

    const normalized = normalizeBlocks(legacyTree);
    expect(normalized.length).toBe(2);

    // Section normalisée
    expect(normalized[0].settings.hideOnMobile).toBe(false);
    expect(normalized[0].settings.hideOnTablet).toBe(true);
    expect(normalized[0].settings.hideOnDesktop).toBe(false);
    expect(normalized[0].settings.style.backgroundColor).toBe('#ffffff'); // Hydraté depuis la définition
    expect(normalized[0].settings.style.paddingBottom).toBe('4rem');     // Conservé
    expect(normalized[0].settings.style.borderColor).toBe('#1e3a8a');    // Conservé

    // Bouton enfant normalisé (récursion)
    const normalizedBtn = normalized[0].children[0];
    expect(normalizedBtn.settings.hideOnMobile).toBe(false);
    expect(normalizedBtn.settings.hideOnTablet).toBe(false);
    expect(normalizedBtn.settings.hideOnDesktop).toBe(false);
    expect(normalizedBtn.settings.text).toBe('Cliquez ici');

    // Heading normalisé
    expect(normalized[1].id).toBeDefined();
    expect(normalized[1].settings.hideOnMobile).toBe(false);
    expect(normalized[1].settings.style.color).toBe('#1e293b');
  });

  test('TEST-M1-T10 : cloneBlock duplique fidèlement les styles étendus et drapeaux responsive avec régénération récursive d\'IDs', () => {
    const sourceBlock = createBlock('section', {
      hideOnMobile: true,
      hideOnTablet: false,
      hideOnDesktop: true,
      style: {
        backgroundColor: '#f0f7ff',
        paddingTop: '3rem',
        paddingBottom: '3rem',
        borderWidth: '2px',
        borderStyle: 'solid',
        borderColor: '#2563eb',
        borderRadius: '16px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }
    });

    const childHeading = createBlock('heading', {
      content: 'Titre de Section',
      hideOnMobile: true,
      style: { color: '#0f2b5c' }
    });

    sourceBlock.children = [childHeading];

    const cloned = cloneBlock(sourceBlock);

    // 1. Identifiants régénérés et distincts
    expect(cloned.id).not.toBe(sourceBlock.id);
    expect(cloned.children[0].id).not.toBe(childHeading.id);

    // 2. Préservation intégrale des drapeaux responsive
    expect(cloned.settings.hideOnMobile).toBe(true);
    expect(cloned.settings.hideOnTablet).toBe(false);
    expect(cloned.settings.hideOnDesktop).toBe(true);
    expect(cloned.children[0].settings.hideOnMobile).toBe(true);

    // 3. Préservation intégrale des styles étendus
    expect(cloned.settings.style.backgroundColor).toBe('#f0f7ff');
    expect(cloned.settings.style.paddingTop).toBe('3rem');
    expect(cloned.settings.style.borderWidth).toBe('2px');
    expect(cloned.settings.style.borderStyle).toBe('solid');
    expect(cloned.settings.style.borderColor).toBe('#2563eb');
    expect(cloned.settings.style.borderRadius).toBe('16px');
    expect(cloned.settings.style.boxShadow).toBe('0 10px 15px -3px rgba(0, 0, 0, 0.1)');
    expect(cloned.children[0].settings.style.color).toBe('#0f2b5c');

    // 4. Indépendance en mémoire (clonage profond)
    cloned.settings.style.backgroundColor = '#ffffff';
    expect(sourceBlock.settings.style.backgroundColor).toBe('#f0f7ff');
  });

  // ========================================================================
  // 3. Tests adversariaux de résistance aux cas limites (Challenger M1-1)
  // ========================================================================

  test('TEST-M1-ADV-1 : Résistance aux collisions d\'ID sur 100 instanciations consécutives', () => {
    const allGeneratedIds = new Set();
    const templateIds = ['hero_centered', 'two_columns_media', 'three_cards_grid', 'cta_banner', 'literary_quote', 'faq_section'];
    let totalBlocksCount = 0;

    const collectAllIds = (blocks) => {
      let ids = [];
      blocks.forEach(b => {
        ids.push(b.id);
        if (Array.isArray(b.children)) {
          ids = ids.concat(collectAllIds(b.children));
        }
      });
      return ids;
    };

    // 100 instanciations réparties sur les 6 modèles
    for (let i = 0; i < 100; i++) {
      const templateId = templateIds[i % templateIds.length];
      const instance = instantiateSectionTemplate(templateId);
      expect(instance.length).toBeGreaterThan(0);

      const ids = collectAllIds(instance);
      totalBlocksCount += ids.length;

      ids.forEach(id => {
        expect(typeof id).toBe('string');
        expect(id.length).toBeGreaterThan(5);
        expect(allGeneratedIds.has(id)).toBe(false); // Zéro collision
        allGeneratedIds.add(id);
      });
    }

    // Le nombre d'identifiants uniques dans le Set doit être rigoureusement égal au nombre total de blocs
    expect(allGeneratedIds.size).toBe(totalBlocksCount);
    expect(totalBlocksCount).toBeGreaterThan(500);
  });

  test('TEST-M1-ADV-2 : Robustesse extrême de instantiateSectionTemplate et getSectionTemplateById face à des entrées anormales', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Valeurs primitives non-chaînes et corrompues
    expect(instantiateSectionTemplate(12345)).toEqual([]);
    expect(instantiateSectionTemplate(true)).toEqual([]);
    expect(instantiateSectionTemplate(false)).toEqual([]);
    expect(instantiateSectionTemplate({})).toEqual([]);
    expect(instantiateSectionTemplate([])).toEqual([]);
    expect(instantiateSectionTemplate(() => {})).toEqual([]);
    expect(instantiateSectionTemplate('   \t\n   ')).toEqual([]);

    // ID avec espaces autour d'un ID valide : doit être résolu grâce au trim()
    const trimmedInstance = instantiateSectionTemplate('   hero_centered   ');
    expect(trimmedInstance.length).toBe(1);
    expect(trimmedInstance[0].type).toBe('section');

    // cloneFn invalides : repli automatique et sécurisé sur internalCloneBlock
    const instanceWithBogusClone1 = instantiateSectionTemplate('hero_centered', 'not-a-fn');
    expect(instanceWithBogusClone1.length).toBe(1);
    expect(instanceWithBogusClone1[0].id).toBeDefined();

    const instanceWithBogusClone2 = instantiateSectionTemplate('hero_centered', 42);
    expect(instanceWithBogusClone2.length).toBe(1);

    const instanceWithBogusClone3 = instantiateSectionTemplate('hero_centered', {});
    expect(instanceWithBogusClone3.length).toBe(1);

    // cloneFn renvoyant null : les blocs nuls sont filtrés proprement sans exception
    const instanceWithNullClone = instantiateSectionTemplate('hero_centered', () => null);
    expect(instanceWithNullClone).toEqual([]);

    // getSectionTemplateById avec types aberrants
    expect(getSectionTemplateById(999)).toBeNull();
    expect(getSectionTemplateById(true)).toBeNull();
    expect(getSectionTemplateById({})).toBeNull();
    expect(getSectionTemplateById([])).toBeNull();

    // getSectionTemplatesByCategory avec valeurs absentes ou aberrantes
    expect(getSectionTemplatesByCategory(null).length).toBe(SECTION_TEMPLATES.length);
    expect(getSectionTemplatesByCategory(undefined).length).toBe(SECTION_TEMPLATES.length);
    expect(getSectionTemplatesByCategory('').length).toBe(SECTION_TEMPLATES.length);
    expect(getSectionTemplatesByCategory(123)).toEqual([]);

    consoleSpy.mockRestore();
  });

  test('TEST-M1-ADV-3 : Robustesse de createBlock face aux réglages corrompus, style null et types responsive aberrants', () => {
    // 1. customSettings null ou undefined
    const blockNullSettings = createBlock('section', null);
    expect(blockNullSettings.id).toBeDefined();
    expect(blockNullSettings.type).toBe('section');
    expect(blockNullSettings.settings.style.backgroundColor).toBe('#ffffff');
    expect(blockNullSettings.settings.hideOnMobile).toBe(false);

    const blockUndefinedSettings = createBlock('section', undefined);
    expect(blockUndefinedSettings.id).toBeDefined();
    expect(blockUndefinedSettings.settings.style.paddingTop).toBe('2rem');

    // 2. customSettings.style null ou corrompu
    const blockNullStyle = createBlock('section', { style: null });
    expect(blockNullStyle.settings.style).toBeDefined();
    expect(blockNullStyle.settings.style.backgroundColor).toBe('#ffffff');

    // 3. Types non-booléens sur les drapeaux responsive (doivent être strictement rejetés vers false)
    const blockBogusFlags = createBlock('section', {
      hideOnMobile: 'true',
      hideOnTablet: 1,
      hideOnDesktop: 'yes',
      hidden: 'true'
    });
    expect(blockBogusFlags.settings.hideOnMobile).toBe(false);
    expect(blockBogusFlags.settings.hideOnTablet).toBe(false);
    expect(blockBogusFlags.settings.hideOnDesktop).toBe(false);
    expect(blockBogusFlags.settings.hidden).toBe(false);

    // 4. Type de bloc inconnu : repli automatique vers 'text'
    const blockUnknown = createBlock('alien_unknown_widget');
    expect(blockUnknown.id).toBeDefined();
    expect(blockUnknown.settings).toBeDefined();
  });

  test('TEST-M1-ADV-4 : Robustesse de normalizeBlocks face aux arbres corrompus et propriétés malformées', () => {
    // 1. Entrées non-tableaux
    expect(normalizeBlocks(null)).toEqual([]);
    expect(normalizeBlocks(undefined)).toEqual([]);
    expect(normalizeBlocks('chaine-invalide')).toEqual([]);
    expect(normalizeBlocks(12345)).toEqual([]);
    expect(normalizeBlocks({})).toEqual([]);

    // 2. Tableau contenant des éléments nuls, corrompus ou primitifs
    const corruptArray = [null, undefined, 42, 'chaine', false, {}, { type: 'unknown_type_xyz' }];
    const normalizedCorrupt = normalizeBlocks(corruptArray);
    expect(Array.isArray(normalizedCorrupt)).toBe(true);
    // Seuls les objets valides sont conservés ({}, { type: 'unknown_type_xyz' })
    expect(normalizedCorrupt.length).toBe(2);
    expect(normalizedCorrupt[0].type).toBe('text'); // Repli par défaut
    expect(normalizedCorrupt[1].type).toBe('text'); // Repli par défaut

    // 3. Bloc avec style null et children non-tableau
    const corruptBlock = [
      {
        id: 'corrupt_1',
        type: 'section',
        settings: {
          style: null,
          hideOnMobile: 'true',
          hideOnTablet: 0,
          hideOnDesktop: null,
          hidden: 1
        },
        children: 'non-un-tableau'
      }
    ];

    const normalizedSingle = normalizeBlocks(corruptBlock);
    expect(normalizedSingle.length).toBe(1);
    expect(normalizedSingle[0].settings.style.backgroundColor).toBe('#ffffff');
    expect(normalizedSingle[0].settings.hideOnMobile).toBe(false);
    expect(normalizedSingle[0].settings.hideOnTablet).toBe(false);
    expect(normalizedSingle[0].settings.hideOnDesktop).toBe(false);
    expect(normalizedSingle[0].settings.hidden).toBe(true);
    expect(Array.isArray(normalizedSingle[0].children)).toBe(true);
    expect(normalizedSingle[0].children).toEqual([]);
  });

  test('TEST-M1-ADV-5 : Isolation absolue des mutations mémoires entre instances de modèles et clones', () => {
    // 1. Instanciation du modèle two_columns_media
    const instanceA = instantiateSectionTemplate('two_columns_media');
    const instanceB = instantiateSectionTemplate('two_columns_media');

    // Mutation profonde sur l'arborescence de l'instance A
    const headingBlockA = instanceA[0].children[0].children[0].children[0].children[0];
    expect(headingBlockA.type).toBe('heading');
    headingBlockA.settings.style.color = '#ff0000';
    headingBlockA.settings.content = 'Titre Modifié dans Instance A';

    // Vérifier que l'instance B n'a absolument pas été altérée
    const headingBlockB = instanceB[0].children[0].children[0].children[0].children[0];
    expect(headingBlockB.settings.style.color).toBe('#0f2b5c');
    expect(headingBlockB.settings.content).toBe('À propos de cette création');

    // Vérifier que la définition d'origine dans SECTION_TEMPLATES reste immaculée
    const originalTemplate = getSectionTemplateById('two_columns_media');
    const originalHeading = originalTemplate.blocks[0].children[0].children[0].children[0].children[0];
    expect(originalHeading.settings.style.color).toBe('#0f2b5c');
    expect(originalHeading.settings.content).toBe('À propos de cette création');

    // 2. Test d'isolation sur cloneBlock
    const sourceBlock = createBlock('section', {
      style: { backgroundColor: '#111111', paddingTop: '1rem' }
    });
    const clonedBlock = cloneBlock(sourceBlock);

    clonedBlock.settings.style.backgroundColor = '#999999';
    clonedBlock.settings.style.paddingTop = '5rem';
    expect(sourceBlock.settings.style.backgroundColor).toBe('#111111');
    expect(sourceBlock.settings.style.paddingTop).toBe('1rem');
  });

  test('TEST-M1-ADV-6 : Scan lexical exhaustif anti-patrimoine sur l\'intégralité des 6 modèles et constantes', () => {
    const forbiddenPatterns = [
      /château/i,
      /duc\s+d['’]anjou/i,
      /tapisserie/i,
      /apocalypse/i,
      /roi\s+rené/i,
      /foulques?\s+nerra/i,
      /plantevaresse/i,
      /cointreau/i,
      /doué-en-anjou/i,
      /terra\s+botanica/i,
      /patrimoine\s+historique/i,
      /guide\s+touristique/i,
      /forteresse/i,
      /vignoble/i,
      /saumur/i,
      /layon/i,
      /maine-et-loire/i,
      /tourisme/i,
      /anjou\s+médiéval/i,
      /monument\s+historique/i
    ];

    const violations = [];

    const deepScan = (value, path = '') => {
      if (value === null || value === undefined) return;
      if (typeof value === 'string') {
        forbiddenPatterns.forEach(regex => {
          if (regex.test(value)) {
            violations.push({ path, value, matchedPattern: regex.toString() });
          }
        });
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => deepScan(item, `${path}[${index}]`));
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([key, val]) => deepScan(val, `${path}.${key}`));
      }
    };

    // Scan de l'ensemble des modèles de section
    SECTION_TEMPLATES.forEach((template, idx) => {
      deepScan(template, `SECTION_TEMPLATES[${idx}:${template.id}]`);
    });

    // Scan de la palette Anjou Édition
    ANJOU_EDITION_PALETTE.forEach((color, idx) => {
      deepScan(color, `ANJOU_EDITION_PALETTE[${idx}]`);
    });

    expect(violations).toEqual([]);
  });

});
