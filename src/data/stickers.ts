export type StickerDefinition = {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  rotate: number;
};

/* Afterspace's own stickers (public/mascots, public/ui; see design/ART-PROVENANCE.md).
   The upstream sticker set (incl. the blue cat) was removed in P2.3; a stored
   sticker row with an old id renders nothing (StickerWidget returns null). */
export const STICKER_CATALOG: StickerDefinition[] = [
  { id: "wisp", label: "wisp", src: "/mascots/wisp-thriving.png", width: 140, height: 140, rotate: -4 },
  { id: "pip", label: "pip the pumpkin", src: "/mascots/pip.png", width: 136, height: 136, rotate: 3 },
  { id: "bones", label: "sleepy bones", src: "/mascots/bones.png", width: 140, height: 140, rotate: -3 },
  { id: "planchette", label: "planchette", src: "/mascots/planchette.png", width: 128, height: 128, rotate: 5 },
  { id: "crystal-ball", label: "crystal ball", src: "/ui/crystal-ball.png", width: 132, height: 132, rotate: -2 },
  { id: "wax-seal", label: "wax seal", src: "/ui/wax-seal.png", width: 110, height: 110, rotate: 6 },
  { id: "candle", label: "candle", src: "/ui/pin-candle.png", width: 96, height: 120, rotate: -5 },
  { id: "wisp-sleepy", label: "wisp, fading", src: "/mascots/wisp-fading.png", width: 136, height: 136, rotate: 4 },
];

export function getStickerDefinition(stickerId: unknown) {
  return STICKER_CATALOG.find((sticker) => sticker.id === stickerId);
}
