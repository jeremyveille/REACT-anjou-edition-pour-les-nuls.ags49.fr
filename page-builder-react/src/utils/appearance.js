// Each breakpoint has one unambiguous display value, including combined hides.
export function visibilityClasses(settings, display = 'block') {
  if (!settings.hideMobile && !settings.hideTablet && !settings.hideDesktop) return '';
  return [
    `d-${settings.hideMobile ? 'none' : display}`,
    `d-md-${settings.hideTablet ? 'none' : display}`,
    `d-lg-${settings.hideDesktop ? 'none' : display}`,
  ].join(' ');
}

export function advancedStyles(settings) {
  const styles = {};
  if (settings.gradientFrom && settings.gradientTo) {
    styles.background = `linear-gradient(${settings.gradientDir || 'to bottom'}, ${settings.gradientFrom}, ${settings.gradientTo})`;
  }
  if (settings.boxShadow) styles.boxShadow = settings.boxShadow;
  return styles;
}
