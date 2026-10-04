import type { AtlasModel } from "@/game/sim/atlas";
import { ATLAS_COLORS } from "@/game/sim/atlas";

/** One on-demand frame; no animation loop, assets, event handlers or engine state. */
export async function mountAtlasPixi(host: HTMLElement, initial: AtlasModel, failed: () => void) {
  const { Application, Graphics } = await import("pixi.js");
  const app = new Application();
  try {
    await app.init({
      preference: ["webgl"],
      autoStart: false,
      sharedTicker: false,
      width: Math.max(1, host.clientWidth),
      height: Math.max(1, host.clientHeight),
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
      antialias: true,
      backgroundAlpha: 0,
      powerPreference: "low-power",
    });
  } catch (error) {
    try {
      app.destroy(true, { children: true });
    } catch {
      /* partial init */
    }
    throw error;
  }
  let dead = false;
  const canvas = app.canvas;
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  const graphics = new Graphics();
  app.stage.addChild(graphics);
  const destroy = () => {
    if (dead) return;
    dead = true;
    canvas.removeEventListener("webglcontextlost", lost);
    app.destroy(true, { children: true, texture: true, textureSource: true });
  };
  const lost = (event: Event) => {
    event.preventDefault();
    destroy();
    failed();
  };
  canvas.addEventListener("webglcontextlost", lost);
  host.appendChild(canvas);
  const update = (model: AtlasModel) => {
    if (dead || !host.clientWidth || !host.clientHeight) return;
    const w = host.clientWidth,
      h = host.clientHeight;
    app.renderer.resize(w, h);
    const b = model.bounds,
      scale = Math.min(w / b.width, h / b.height);
    graphics.position.set(
      (w - b.width * scale) / 2 - b.x * scale,
      (h - b.height * scale) / 2 - b.y * scale,
    );
    graphics.scale.set(scale);
    graphics.clear();
    for (const e of model.edges) {
      const color = e.affected ? ATLAS_COLORS.warn : e.risk >= 58 ? ATLAS_COLORS.risk : e.color;
      const width = e.selected ? 4 : e.affected ? 3 : 1.5;
      if (e.dashed) {
        const len = Math.hypot(e.x2 - e.x1, e.y2 - e.y1);
        for (let d = 0; d < len; d += 12) {
          const end = Math.min(d + 7, len);
          graphics
            .moveTo(e.x1 + ((e.x2 - e.x1) * d) / len, e.y1 + ((e.y2 - e.y1) * d) / len)
            .lineTo(e.x1 + ((e.x2 - e.x1) * end) / len, e.y1 + ((e.y2 - e.y1) * end) / len);
        }
      } else graphics.moveTo(e.x1, e.y1).lineTo(e.x2, e.y2);
      graphics.stroke({ color, width, alpha: e.selected || e.affected ? 1 : 0.55 });
    }
    for (const n of model.nodes) {
      if (n.selected) graphics.circle(n.x, n.y, 29).stroke({ color: ATLAS_COLORS.olive, width: 2 });
      if (n.projectedHeat > 0)
        graphics.circle(n.x, n.y, 23).stroke({ color: ATLAS_COLORS.risk, width: 1 });
      if (n.kind === "kurum") graphics.roundRect(n.x - 21, n.y - 14, 42, 28, 3);
      else if (n.kind === "koridor")
        graphics.poly([n.x, n.y - 17, n.x + 17, n.y, n.x, n.y + 17, n.x - 17, n.y]);
      else graphics.circle(n.x, n.y, 14);
      graphics
        .fill({ color: ATLAS_COLORS.surface, alpha: n.dead ? 0.5 : 1 })
        .stroke({ color: n.color, width: 1.5 });
    }
    app.render();
  };
  try {
    update(initial);
  } catch (error) {
    destroy();
    throw error;
  }
  return { update, destroy };
}
