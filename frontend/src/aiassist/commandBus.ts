type VoiceCommandPayload = Record<string, any>;

export type VoiceCommandEvent = {
  type: string;
  payload?: VoiceCommandPayload;
};

const bus = new EventTarget();
const EVENT_NAME = 'printchakra:voice-command';

export function emitVoiceCommand(event: VoiceCommandEvent) {
  bus.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
}

export function onVoiceCommand(handler: (event: VoiceCommandEvent) => void) {
  const listener = (e: Event) => {
    const ce = e as CustomEvent<VoiceCommandEvent>;
    handler(ce.detail);
  };
  bus.addEventListener(EVENT_NAME, listener);
  return () => bus.removeEventListener(EVENT_NAME, listener);
}

