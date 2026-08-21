export const theme = {
  bg: '#080808',
  panel: '#0C0C0C',
  surface: '#111111',
  border: '#2A2824',
  rule: '#C5A572',
  text: '#F4F1EC',
  muted: '#8A8680',
  accent: '#C5A572',
  danger: '#C47A6A',
  currentLine: '#1A1814',
  currentLineText: '#C5A572',
  play: '#C5A572',
  pause: '#C5A572',
  step: '#C5A572',
  reset: '#C5A572',
} as const;

export const type = {
  label: {
    color: '#8A8680',
    fontSize: 10,
    fontWeight: '500' as const,
    letterSpacing: 2.6,
    textTransform: 'uppercase' as const,
  },
  wordmark: {
    color: '#F4F1EC',
    fontSize: 13,
    fontWeight: '400' as const,
    letterSpacing: 3.2,
    textTransform: 'uppercase' as const,
  },
} as const;
