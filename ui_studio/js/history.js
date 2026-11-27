// Snapshot-based undo/redo. Each entry stores the serialized project *before* an action.
export class History {
  constructor(limit = 200) { this.limit = limit; this.reset(null); }
  reset(state) {
    this.past = [];     // [{label, state}]
    this.future = [];
    this.current = state;
    this.currentLabel = 'Open project';
    this.lastKey = null; this.lastTime = 0;
  }
  /** Record that the project changed to `state` because of `label`. Consecutive commits with the same key merge. */
  commit(label, state, key = null) {
    if (state === this.current) return false;
    const now = Date.now();
    if (key && key === this.lastKey && now - this.lastTime < 1000 && this.past.length) {
      this.current = state; this.lastTime = now; this.future = [];
      return true;
    }
    this.past.push({ label: this.currentLabel, state: this.current });
    if (this.past.length > this.limit) this.past.shift();
    this.current = state; this.currentLabel = label;
    this.future = [];
    this.lastKey = key; this.lastTime = now;
    return true;
  }
  canUndo() { return this.past.length > 0; }
  canRedo() { return this.future.length > 0; }
  undo() {
    if (!this.past.length) return null;
    const prev = this.past.pop();
    this.future.push({ label: this.currentLabel, state: this.current });
    this.current = prev.state; this.currentLabel = prev.label; this.lastKey = null;
    return this.current;
  }
  redo() {
    if (!this.future.length) return null;
    const next = this.future.pop();
    this.past.push({ label: this.currentLabel, state: this.current });
    this.current = next.state; this.currentLabel = next.label; this.lastKey = null;
    return this.current;
  }
  /** Entries for display: past..., current, future (reversed). */
  entries() {
    return [
      ...this.past.map((e, i) => ({ label: e.label, idx: i - this.past.length })),
      { label: this.currentLabel, idx: 0 },
      ...[...this.future].reverse().map((e, i) => ({ label: e.label, idx: i + 1 })),
    ];
  }
}
