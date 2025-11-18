import { SystemStyleObject } from '@chakra-ui/react';

// Library of reusable style snippets described with natural, English-like keys
export const styleCommandLibrary: Record<string, SystemStyleObject> = {
  'rounded glass panel': {
    borderRadius: '24px',
    borderWidth: '1px',
    borderColor: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(24px)',
    bg: 'rgba(8, 15, 37, 0.72)',
  },
  'soft glow border': {
    boxShadow: '0 0 0 1px rgba(99,102,241,0.25), 0 15px 45px rgba(15,23,42,0.55)',
  },
  'padded layout': {
    px: { base: 4, md: 6 },
    py: { base: 5, md: 7 },
  },
  'section spacing': {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  'stacked column layout': {
    display: 'flex',
    flexDirection: { base: 'column', xl: 'row' },
    gap: 6,
    alignItems: 'stretch',
  },
  'sidebar column': {
    flex: { base: 'auto', xl: '0 0 360px' },
  },
  'workspace column': {
    flex: 1,
    minW: 0,
  },
  'toolbar surface': {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  'float shadow': {
    boxShadow: '0 25px 65px rgba(15,23,42,0.55)',
  },
  'subtle border': {
    borderWidth: '1px',
    borderColor: 'rgba(148,163,184,0.15)',
    borderRadius: 'xl',
  },
  'scroll container': {
    overflowY: 'auto',
    pr: 2,
  },
  'soft gradient canvas': {
    bgGradient:
      'linear(180deg, rgba(2,6,23,1) 0%, rgba(4,12,33,0.92) 45%, rgba(7,17,41,0.9) 100%)',
  },
  'contained width': {
    maxW: '1400px',
    mx: 'auto',
    w: '100%',
  },
  'card padding': {
    p: { base: 4, md: 6 },
  },
  'command chip': {
    borderRadius: 'full',
    px: 4,
    py: 2,
    fontWeight: 600,
    bg: 'rgba(15,23,42,0.55)',
  },
  'divider glow': {
    borderBottomWidth: '1px',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  'sticky sidebar': {
    position: 'sticky',
    top: { base: 2, md: 8 },
  },
  'command center panel': {
    bg: 'rgba(15, 18, 38, 0.92)',
    borderRadius: '28px',
    borderWidth: '1px',
    borderColor: 'rgba(99,102,241,0.35)',
    boxShadow: '0 30px 80px rgba(7,10,25,0.7)',
  },
  'bleedless': {
    w: '100%',
  },
  'micro radius': {
    borderRadius: 'md',
  },
};

export const interpretCommandText = (commandText: string): string[] => {
  const normalized = commandText.toLowerCase();
  return Object.keys(styleCommandLibrary).filter(key => normalized.includes(key));
};

export const resolveCommandList = (commands: string[] = []): SystemStyleObject => {
  return commands.reduce<SystemStyleObject>((acc, command) => {
    const preset = styleCommandLibrary[command];
    if (!preset) {
      return acc;
    }
    return mergeStyles(acc, preset);
  }, {});
};

type StyleAccumulator = Record<string, any>;

export const mergeStyles = (
  base: SystemStyleObject = {},
  next: SystemStyleObject = {}
): SystemStyleObject => {
  const output: StyleAccumulator = { ...(base ?? {}) };

  Object.entries(next ?? {}).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const current = output[key];
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        output[key] = mergeStyles(current as SystemStyleObject, value as SystemStyleObject);
      } else {
        output[key] = mergeStyles({}, value as SystemStyleObject);
      }
    } else {
      output[key] = value;
    }
  });

  return output as SystemStyleObject;
};
