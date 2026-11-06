import { format, type Packet, type Cohort } from "./site-packets";
export type Position = {
  packet: Packet;
  x: number;
  y: number;
  size: number;
  color: string;
  reference?: 'alex' | 'you';
};
type Dot = Position & {
  sx: number;
  sy: number;
  ss: number;
  ox: number;
  oy: number;
  os: number;
  delay: number;
};
export class PacketField {
  private ctx: CanvasRenderingContext2D;
  private dots: Dot[] = [];
  private frame = 0;
  private start = 0;
  private duration = 0;
  private hover: Dot | null = null;
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private resizeObserver: ResizeObserver;
  width = 1;
  height = 1;
  paused = false;
  onResize = () => {};
  onSettled = () => {};
  onHover: (packet: Packet | null, x: number, y: number) => void = () => {};
  constructor(
    public canvas: HTMLCanvasElement,
    private variant: "retro" | "endfield",
    private onSelect: (packet: Packet) => void,
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.resizeObserver = new ResizeObserver(() => {
      const bounds = canvas.getBoundingClientRect();
      this.width = bounds.width;
      this.height = bounds.height;
      const dpr = Math.min(devicePixelRatio, 2);
      canvas.width = Math.round(this.width * dpr);
      canvas.height = Math.round(this.height * dpr);
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.onResize();
      this.draw(performance.now());
    });
    this.resizeObserver.observe(canvas);
    canvas.addEventListener("pointermove", (e) => {
      const b = canvas.getBoundingClientRect(),
        x = e.clientX - b.left,
        y = e.clientY - b.top;
      let best: Dot | null = null,
        dist = Infinity;
      for (const dot of this.dots) {
        const d = (dot.sx - x) ** 2 + (dot.sy - y) ** 2;
        if (d < Math.max(8, dot.ss * 1.1) ** 2 && d < dist) {
          best = dot;
          dist = d;
        }
      }
      if (best !== this.hover) {
        this.hover = best;
        canvas.style.cursor = best ? "pointer" : "default";
        this.onHover(best?.packet || null, x, y);
        this.request();
      }
    });
    canvas.addEventListener("pointerleave", () => {
      this.hover = null;
      this.onHover(null, 0, 0);
      this.request();
    });
    canvas.addEventListener("click", (event) => {
      const b = canvas.getBoundingClientRect(),
        x = event.clientX - b.left,
        y = event.clientY - b.top;
      let selected: Dot | null = null,
        nearest = Infinity;
      for (const dot of this.dots) {
        const distance = (dot.sx - x) ** 2 + (dot.sy - y) ** 2;
        if (distance < Math.max(10, dot.ss * 1.1) ** 2 && distance < nearest) {
          selected = dot;
          nearest = distance;
        }
      }
      if (selected) this.onSelect(selected.packet);
    });
    this.reduced.addEventListener("change", () => {
      this.duration = 0;
      this.request();
    });
  }
  set(positions: Position[], duration = 700) {
    this.canvas.setAttribute("aria-busy", "true");
    this.canvas.dataset.unitCount = String(positions.filter(p=>!p.reference).length);
    this.canvas.dataset.responseCount = String(
      positions.reduce((n, p) => n + p.packet.members.length, 0),
    );
    const previous = new Map<string, Dot>();
    for (const d of this.dots) { previous.set(d.packet.id,d); for (const member of d.packet.members) previous.set(member.id, d); }
    this.dots = positions.map((p, i) => {
      const old = previous.get(p.packet.members[0]?.id ?? p.packet.id);
      const ox = old?.sx ?? this.width / 2,
        oy = old?.sy ?? this.height * 0.56,
        os = old?.ss ?? 0;
      return {
        ...p,
        sx: ox,
        sy: oy,
        ss: os,
        ox,
        oy,
        os,
        delay: this.variant === "retro" ? (i % 37) * 4 : (i % 6) * 14,
      };
    });
    this.start = performance.now();
    this.duration = this.reduced.matches || this.paused ? 0 : duration;
    this.request();
  }
  suspend() {
    this.paused=true;this.duration=0;if(this.frame)cancelAnimationFrame(this.frame);this.frame=0;
  }
  resume() { this.paused=false;this.request(); }
  request() {
    if(this.paused)return;
    if (!this.frame)
      this.frame = requestAnimationFrame((t) => {
        this.frame = 0;
        this.draw(t);
      });
  }
  draw(time: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    let moving = false;
    for (const d of this.dots) {
      const progress =
        this.duration === 0
          ? 1
          : Math.min(
              1,
              Math.max(0, (time - this.start - d.delay) / this.duration),
            );
      // Exponential convergence is deliberately avoided: each update reaches its exact destination.
      if (progress < 1) {
        moving = true;
        const ease =
          this.variant === "retro"
            ? 1 - Math.pow(1 - progress, 3)
            : progress < 0.5
              ? 4 * progress ** 3
              : 1 - (-2 * progress + 2) ** 3 / 2;
        d.sx = d.ox + (d.x - d.ox) * ease;
        d.sy = d.oy + (d.y - d.oy) * ease;
        d.ss = d.os + (d.size - d.os) * ease;
      } else {
        d.sx = d.x;
        d.sy = d.y;
        d.ss = d.size;
      }
      const selected = d === this.hover;
      ctx.fillStyle = selected
        ? this.variant === "retro"
          ? "#fff5fd"
          : "#fffa00"
        : d.color;
      const s = d.ss;
      ctx.globalAlpha = selected ? 1 : this.variant === "retro" ? 0.7 : 1;
      if (this.variant === "retro") {
        // Each glyph is a packet, not a claim that an aggregate is a single person.
        ctx.beginPath();
        ctx.arc(d.sx, d.sy - s * 0.45, s * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(d.sx - s * 0.29, d.sy - s * 0.04, s * 0.58, s * 0.7);
      } else {
        const swing=progress<1?Math.sin(progress*Math.PI*8)*.22:0;
        ctx.save();ctx.translate(d.sx,d.sy-Math.abs(swing)*s*.12);
        ctx.beginPath();ctx.arc(0,-s*.87,s*.25,0,Math.PI*2);ctx.fill();
        ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=s*.26;ctx.lineCap='round';
        ctx.beginPath();ctx.moveTo(0,-s*.37);ctx.lineTo(0,s*.35);
        ctx.moveTo(-s*.46,s*(.16+swing));ctx.lineTo(0,-s*.26);ctx.lineTo(s*.46,s*(.16-swing));
        ctx.moveTo(-s*(.28+swing),s*1.05);ctx.lineTo(0,s*.32);ctx.lineTo(s*(.28-swing),s*1.05);ctx.stroke();ctx.restore();
      }
      if (selected) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = this.variant === "retro" ? "#62efff" : "#161616";
        ctx.lineWidth = 1;
        ctx.strokeRect(d.sx - s - 3, d.sy - s - 3, s * 2 + 6, s * 2 + 6);
      }
    }
    ctx.globalAlpha = 1;
    if (moving) this.request();
    else { this.canvas.setAttribute("aria-busy", "false"); this.onSettled(); }
  }
}
/** A compact matrix with equal-sized marks; residual packets retain their real sizes. */
export function gridPositions(
  group: Cohort,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): Position[] {
  const count = group.packets.length;
  let cols = Math.max(1, Math.ceil(Math.sqrt((count * w) / h)));
  const rows = Math.ceil(count / cols),
    step = Math.min(w / cols, h / rows);
  const ox = x + (w - cols * step) / 2,
    oy = y + (h - rows * step) / 2;
  return group.packets.map((packet, i) => ({
    packet,
    x: ox + ((i % cols) + 0.5) * step,
    y: oy + (Math.floor(i / cols) + 0.5) * step,
    size: Math.min(step * 0.57, 11),
    color,
  }));
}
export function packetStatus(groups: Cohort[]) {
  return `${format(groups.reduce((n, g) => n + g.packets.length, 0))} units / up to 50 responses each`;
}
