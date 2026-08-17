import React from 'react';

/**
 * Composant Section Bootstrap.
 */
export const Section = ({ settings = {}, children, isEditing }) => {
  const defaultClasses = 'py-4';
  const customClasses = settings.classes || '';
  const style = settings.style || {};
  const bgImage = settings.backgroundImage ? { backgroundImage: `url(${settings.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {};

  return (
    <section 
      className={`pb-section ${defaultClasses} ${customClasses}`} 
      style={{ ...style, ...bgImage }}
    >
      {children}
    </section>
  );
};

/**
 * Composant Container Bootstrap.
 */
export const Container = ({ settings = {}, children, isEditing }) => {
  const isFluid = settings.fluid || false;
  const defaultClasses = isFluid ? 'container-fluid' : 'container';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div 
      className={`pb-container ${defaultClasses} ${customClasses}`} 
      style={style}
    >
      {children}
    </div>
  );
};

/**
 * Composant Row Bootstrap.
 */
export const Row = ({ settings = {}, children, isEditing }) => {
  const defaultClasses = 'row';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div 
      className={`pb-row ${defaultClasses} ${customClasses}`} 
      style={style}
    >
      {children}
    </div>
  );
};

/**
 * Composant Column Bootstrap.
 */
export const Column = ({ settings = {}, children, isEditing }) => {
  // Par défaut une colonne simple, mais on peut personnaliser ses largeurs Bootstrap
  const sizeClasses = settings.sizeClasses || 'col';
  const customClasses = settings.classes || '';
  const style = settings.style || {};

  return (
    <div 
      className={`pb-column ${sizeClasses} ${customClasses}`} 
      style={style}
    >
      {children}
    </div>
  );
};
