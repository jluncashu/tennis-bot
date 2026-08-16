import { EventEmitter } from "events";

// In-process pub/sub for "something changed" notifications, scoped per club.
// Good enough for a single-process deployment; a multi-instance deployment
// would need a shared broker (e.g. Redis pub/sub) instead.
const emitter = new EventEmitter();
emitter.setMaxListeners(0); // unbounded — one listener per open dashboard connection

export function emitBookingsChanged(clubId: string): void {
  emitter.emit(clubId);
}

export function subscribeToBookingEvents(clubId: string, onEvent: () => void): () => void {
  emitter.on(clubId, onEvent);
  return () => emitter.off(clubId, onEvent);
}
