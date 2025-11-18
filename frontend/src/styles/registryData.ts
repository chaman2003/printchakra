import { ComponentStyleConfig } from './types';

export const componentStyleRegistry: Record<string, ComponentStyleConfig> = {
  'PageShell.Container': {
    description: 'Global page wrapper and background',
    commands: ['soft gradient canvas'],
  },
  'Dashboard.Shell': {
    description: 'Dashboard page canvas',
    commands: ['padded layout', 'contained width'],
  },
  'Dashboard.Layout': {
    description: 'Primary two-column layout',
    commands: ['stacked column layout'],
  },
  'Dashboard.Sidebar': {
    description: 'Right sidebar wrapper for chat/preview',
    commands: ['sidebar column', 'sticky sidebar'],
  },
  'Dashboard.Workspace': {
    description: 'Main workspace column',
    commands: ['workspace column'],
  },
  'Dashboard.Toolbar': {
    description: 'Toolbar with orchestration actions',
    commands: ['toolbar surface', 'rounded glass panel', 'card padding'],
  },
  'SurfaceCard.Root': {
    description: 'Reusable elevated surface',
    commands: ['rounded glass panel', 'soft glow border', 'card padding'],
  },
  'VoiceAIChat.Container': {
    description: 'Drawer container for voice chat',
    commands: ['command center panel', 'soft glow border', 'padded layout'],
  },
  'VoiceAIChat.Header': {
    description: 'Voice chat header with status badges',
    commands: ['toolbar surface', 'divider glow'],
  },
  'VoiceAIChat.Controls': {
    description: 'Footer control area for buttons',
    commands: ['toolbar surface'],
  },
  'DocumentSelector.Wrapper': {
    description: 'Document selector modal surface',
    commands: ['rounded glass panel', 'soft glow border'],
  },
  'DocumentPreview.Container': {
    description: 'Document preview bounding box',
    commands: ['rounded glass panel', 'soft glow border'],
  },
  'Phone.Shell': {
    description: 'Phone capture workspace',
    commands: ['padded layout', 'rounded glass panel'],
  },
};
