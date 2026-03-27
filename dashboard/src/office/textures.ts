import { Texture } from "pixi.js";
import { CHARACTER_VARIANTS } from "./palette";

export interface CharacterTextures {
  idle: Texture;
  working: [Texture, Texture];
  done: Texture;
  checkpoint: Texture;
}

const SW = 20;
const SH = 26;
const CX = 10;
const OC = { r: 0x18, g: 0x10, b: 0x1e };

function px(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 1, 1);
}

function rect(ctx: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function shape(ctx: OffscreenCanvasRenderingContext2D, cx: number, y0: number, color: string, widths: number[]): void {
  ctx.fillStyle = color;
  for (let i = 0; i < widths.length; i++) {
    const w = widths[i];
    if (w > 0) ctx.fillRect(Math.round(cx - w / 2), y0 + i, w, 1);
  }
}

function addOutline(src: OffscreenCanvas, dst: OffscreenCanvas): void {
  const sw2 = src.width, sh2 = src.height;
  const sctx = src.getContext("2d")!;
  const dctx = dst.getContext("2d")!;
  const sd = sctx.getImageData(0, 0, sw2, sh2).data;
  const has = (x: number, y: number) =>
    x >= 0 && x < sw2 && y >= 0 && y < sh2 && sd[(y * sw2 + x) * 4 + 3] > 0;

  dctx.fillStyle = `rgb(${OC.r},${OC.g},${OC.b})`;
  for (let y = 0; y < sh2; y++) {
    for (let x = 0; x < sw2; x++) {
      if (sd[(y * sw2 + x) * 4 + 3] > 0) continue;
      let border = false;
      for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]] as const) {
        if (has(x + dx, y + dy)) { border = true; break; }
      }
      if (!border) {
        if (has(x-1,y-1) && !has(x-1,y) && !has(x,y-1)) border = true;
        if (has(x+1,y-1) && !has(x+1,y) && !has(x,y-1)) border = true;
        if (has(x-1,y+1) && !has(x-1,y) && !has(x,y+1)) border = true;
        if (has(x+1,y+1) && !has(x+1,y) && !has(x,y+1)) border = true;
      }
      if (border) dctx.fillRect(x, y, 1, 1);
    }
  }
  dctx.drawImage(src, 0, 0);
}

function canvasToTexture(canvas: OffscreenCanvas): Texture {
  const bmp = canvas.transferToImageBitmap();
  return Texture.from({ resource: bmp, scaleMode: "nearest" });
}

function hexToStr(hex: number): string {
  return "#" + hex.toString(16).padStart(6, "0");
}

function lighten(hex: number, amount: number): string {
  const r = Math.min(255, ((hex >> 16) & 0xff) + amount);
  const g = Math.min(255, ((hex >> 8) & 0xff) + amount);
  const b = Math.min(255, (hex & 0xff) + amount);
  return `rgb(${r},${g},${b})`;
}

function darken(hex: number, amount: number): string {
  const r = Math.max(0, ((hex >> 16) & 0xff) - amount);
  const g = Math.max(0, ((hex >> 8) & 0xff) - amount);
  const b = Math.max(0, (hex & 0xff) - amount);
  return `rgb(${r},${g},${b})`;
}

type CharState = "idle" | "working0" | "working1" | "done";

function drawCharacter(ctx: OffscreenCanvasRenderingContext2D, variantIndex: number, state: CharState): void {
  const v = CHARACTER_VARIANTS[variantIndex % CHARACTER_VARIANTS.length];
  const hair = hexToStr(v.hair);
  const hairH = lighten(v.hair, 32);
  const hairD = darken(v.hair, 16);
  const skin = hexToStr(v.skin);
  const skinS = darken(v.skin, 20);
  const skinH = lighten(v.skin, 16);
  const shirt = hexToStr(v.shirt);
  const shirtH = lighten(v.shirt, 16);
  const shirtD = darken(v.shirt, 16);
  const pants = hexToStr(v.pants);
  const pantsH = lighten(v.pants, 16);
  const shoe = hexToStr(v.shoe);
  const shoeH = lighten(v.shoe, 16);

  // Ground shadow
  ctx.fillStyle = "rgba(0,0,0,0.1)";
  ctx.beginPath();
  ctx.ellipse(CX, 24, 5, 2, 0, 0, Math.PI * 2);
  ctx.fill();

  // Hair dome
  shape(ctx, CX, 0, hair, [4, 8, 10, 12, 12, 12, 12, 10, 8, 4]);
  shape(ctx, CX, 1, hairH, [4, 6, 4]);
  rect(ctx, 4, 3, 1, 4, hairD);
  rect(ctx, 15, 3, 1, 4, hairD);

  // Face
  shape(ctx, CX, 5, skin, [8, 8, 8, 6, 4]);
  shape(ctx, CX, 5, skinH, [6]);
  rect(ctx, 13, 6, 1, 2, skinS);
  rect(ctx, 5, 5, 2, 1, hair);
  rect(ctx, 13, 5, 2, 1, hair);
  px(ctx, 3, 6, skin);
  px(ctx, 16, 6, skinS);

  // Eyes
  const ey = 6;
  if (state === "done") {
    rect(ctx, 7, ey, 2, 1, hairD);
    rect(ctx, 11, ey, 2, 1, hairD);
  } else if (state === "working0" || state === "working1") {
    rect(ctx, 7, ey, 2, 1, "#eee");
    rect(ctx, 11, ey, 2, 1, "#eee");
    px(ctx, 7, ey, "#1a2848");
    px(ctx, 12, ey, "#1a2848");
  } else {
    rect(ctx, 7, ey, 2, 2, "#eee");
    rect(ctx, 11, ey, 2, 2, "#eee");
    px(ctx, 8, ey + 1, "#1a2848");
    px(ctx, 12, ey + 1, "#1a2848");
    px(ctx, 7, ey, "#fff");
    px(ctx, 11, ey, "#fff");
  }
  rect(ctx, 7, ey - 1, 2, 1, hairD);
  rect(ctx, 11, ey - 1, 2, 1, hairD);
  px(ctx, CX, 8, skinS);
  if (state === "done") {
    rect(ctx, 8, 9, 4, 1, "#d09878");
  } else {
    rect(ctx, 9, 9, 2, 1, "#c09878");
  }

  // Neck
  rect(ctx, 9, 10, 3, 1, skin);

  // Body
  rect(ctx, 7, 11, 6, 1, shirtH);
  shape(ctx, CX, 12, shirt, [10, 12, 12, 10]);
  shape(ctx, CX, 12, shirtH, [8, 10]);
  rect(ctx, 4, 13, 1, 2, shirtD);
  rect(ctx, 15, 13, 1, 2, shirtD);
  px(ctx, CX, 13, shirtD);
  px(ctx, CX, 15, shirtD);
  rect(ctx, 5, 16, 10, 1, "#2a2228");
  rect(ctx, 9, 16, 2, 1, "#5a5a6a");

  // Arms
  if (state === "working0") {
    rect(ctx, 2, 12, 2, 3, shirt);
    px(ctx, 2, 12, shirtD);
    rect(ctx, 1, 14, 2, 2, skin);
    rect(ctx, 16, 12, 2, 3, shirtD);
    rect(ctx, 17, 14, 2, 2, skinS);
  } else if (state === "working1") {
    rect(ctx, 2, 12, 2, 3, shirt);
    px(ctx, 2, 12, shirtD);
    rect(ctx, 1, 13, 2, 2, skin);
    rect(ctx, 16, 12, 2, 3, shirtD);
    rect(ctx, 17, 13, 2, 2, skinS);
  } else if (state === "done") {
    rect(ctx, 2, 8, 2, 4, shirt);
    rect(ctx, 1, 5, 2, 3, skin);
    rect(ctx, 16, 8, 2, 4, shirtD);
    rect(ctx, 17, 5, 2, 3, skinS);
  } else {
    rect(ctx, 2, 12, 2, 3, shirt);
    px(ctx, 2, 12, shirtD);
    rect(ctx, 2, 15, 2, 2, skin);
    rect(ctx, 16, 12, 2, 3, shirtD);
    rect(ctx, 16, 15, 2, 2, skinS);
  }

  // Pants + shoes
  rect(ctx, 6, 17, 3, 3, pants);
  rect(ctx, 11, 17, 3, 3, pants);
  px(ctx, 7, 17, pantsH);
  px(ctx, 12, 17, pantsH);
  rect(ctx, 5, 20, 4, 2, shoe);
  rect(ctx, 11, 20, 4, 2, shoe);
  rect(ctx, 6, 20, 2, 1, shoeH);
  rect(ctx, 12, 20, 2, 1, shoeH);

  // State FX
  if (state === "working0" || state === "working1") {
    ctx.fillStyle = "rgba(74,154,255,0.03)";
    ctx.fillRect(4, 4, 12, 6);
  }
  if (state === "done") {
    [[1,1],[18,2],[5,0],[15,-1],[CX,-2]].forEach(([sx, sy]) => {
      px(ctx, sx, sy, "#ffdd66");
    });
  }
}

const textureCache = new Map<number, CharacterTextures>();

function buildTexture(variantIndex: number, state: CharState): Texture {
  const src = new OffscreenCanvas(SW, SH);
  const sctx = src.getContext("2d")!;
  drawCharacter(sctx, variantIndex, state);

  const padded = SW + 2;
  const paddedH = SH + 2;
  const dst = new OffscreenCanvas(padded, paddedH);
  const shifted = new OffscreenCanvas(padded, paddedH);
  const shctx = shifted.getContext("2d")!;
  shctx.drawImage(src, 1, 1);

  addOutline(shifted, dst);
  return canvasToTexture(dst);
}

export function getCharacterTextures(variantIndex: number): CharacterTextures {
  const cached = textureCache.get(variantIndex);
  if (cached) return cached;

  const textures: CharacterTextures = {
    idle: buildTexture(variantIndex, "idle"),
    working: [
      buildTexture(variantIndex, "working0"),
      buildTexture(variantIndex, "working1"),
    ],
    done: buildTexture(variantIndex, "done"),
    checkpoint: buildTexture(variantIndex, "idle"),
  };

  textureCache.set(variantIndex, textures);
  return textures;
}
