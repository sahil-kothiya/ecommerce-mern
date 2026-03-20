import { EventEmitter } from "node:events";

export const appEventBus = new EventEmitter();
appEventBus.setMaxListeners(50);
