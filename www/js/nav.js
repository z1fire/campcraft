// Scene registry so scenes can navigate without circular import problems.
import { setScene } from './engine.js';
import { save } from './save.js';
import { clearUI, closeBubble } from './ui.js';

export const SC = {};
export function go(name, arg) {
  closeBubble();
  clearUI();
  save();
  setScene(SC[name], arg);
}
