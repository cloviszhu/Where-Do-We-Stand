/** A wheel burst advances at most once; its inertial tail cannot queue scenes. */
export class SceneGesture {
  private last = -Infinity;
  private changed = -Infinity;
  private total = 0;
  private consumed = false;
  reset() { this.total = 0; this.consumed = true; }
  feed(delta: number, time: number, reading = false): number {
    if (time - this.last > 220) { this.total = 0; this.consumed = false; }
    this.last = time;
    if (reading) this.consumed = true;
    if (this.consumed || time - this.changed < 480) return 0;
    if (Math.sign(delta) !== Math.sign(this.total)) this.total = 0;
    this.total += delta;
    if (Math.abs(this.total) < 65) return 0;
    this.consumed = true; this.changed = time;
    return Math.sign(this.total);
  }
}
