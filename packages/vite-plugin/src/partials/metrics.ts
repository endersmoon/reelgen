import {EventName, sendEvent} from '@reelgen/telemetry';
import type {Plugin} from 'vite';

export function metricsPlugin(): Plugin {
  return {
    name: 'revideo:metrics',

    async configResolved() {
      sendEvent(EventName.ServerStarted);
    },
  };
}
