import { emitVoiceCommand } from './commandBus';

type NavigateFn = (to: string) => void;

export type VoiceCommandDetectedPayload = {
  type?: string;
  route?: string;
  path?: string;
  url?: string;
  action?: string;
  intent?: string;
  open_ui?: boolean;
  [key: string]: any;
};

export function routeVoiceCommand(payload: VoiceCommandDetectedPayload, navigate: NavigateFn) {
  if (!payload || typeof payload !== 'object') return;

  const payloadCommand = (payload.command || '').toString().toLowerCase();
  const type = (payload.type || payload.action || '').toLowerCase();

  // Navigation intents
  if (type === 'navigate' || payload.route || payload.path || payload.url) {
    const to = (payload.route || payload.path || payload.url || '').toString();
    if (to) navigate(to);
    emitVoiceCommand({ type: 'navigate', payload: { to, raw: payload } });
    emitVoiceCommand({
      type: 'dashboard_command',
      payload: {
        command: 'navigate',
        params: { target: to || payload.target || payload.page || '' },
        raw: payload,
      },
    });
    return;
  }

  // Workflow intents (print/scan)
  const intent = (payload.intent || '').toLowerCase();
  if (intent === 'print' || intent === 'scan' || type === 'workflow') {
    const command = intent === 'scan' ? 'start_scan' : 'start_print';
    emitVoiceCommand({
      type: 'dashboard_command',
      payload: {
        command,
        params: payload,
        raw: payload,
      },
    });
    emitVoiceCommand({ type: 'workflow', payload });
    return;
  }

  if (payloadCommand) {
    emitVoiceCommand({
      type: 'dashboard_command',
      payload: { command: payloadCommand, params: payload.params || payload, raw: payload },
    });
    return;
  }

  // UI actions (open drawers/modals/etc.)
  if (type) {
    emitVoiceCommand({
      type: 'dashboard_command',
      payload: { command: type, params: payload.params || payload, raw: payload },
    });
    emitVoiceCommand({ type, payload });
    return;
  }

  emitVoiceCommand({ type: 'unknown', payload });
}

