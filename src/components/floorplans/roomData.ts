import { Floor } from "@/lib/types";

export interface RoomDef {
  id: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FloorPlanDef {
  floor: Floor;
  viewBox: string;
  rooms: RoomDef[];
}

// Overetasje: ARBEIDSROM, GANG, BOD, TRIMROM
const overetasje: FloorPlanDef = {
  floor: "overetasje",
  viewBox: "0 0 400 300",
  rooms: [
    { id: "arbeidsrom", label: "Arbeidsrom", x: 8, y: 8, w: 182, h: 132 },
    { id: "gang-oe", label: "Gang", x: 194, y: 8, w: 82, h: 284 },
    { id: "bod-oe", label: "Bod", x: 280, y: 8, w: 112, h: 132 },
    { id: "trimrom", label: "Trimrom", x: 8, y: 144, w: 182, h: 148 },
  ],
};

// Underetasje: VASKEROM, BAD, SOVEROM x3, STUE, BOD x2, VERANDA, TERRASSE
const underetasje: FloorPlanDef = {
  floor: "underetasje",
  viewBox: "0 0 500 390",
  rooms: [
    { id: "vaskerom", label: "Vaskerom", x: 8, y: 8, w: 92, h: 112 },
    { id: "bad-ue", label: "Bad", x: 104, y: 8, w: 92, h: 112 },
    { id: "soverom-1-ue", label: "Soverom 1", x: 200, y: 8, w: 128, h: 112 },
    { id: "veranda-ue", label: "Veranda", x: 332, y: 8, w: 160, h: 112 },
    { id: "bod-1-ue", label: "Bod", x: 8, y: 124, w: 92, h: 62 },
    { id: "bod-2-ue", label: "Bod 2", x: 8, y: 190, w: 92, h: 70 },
    { id: "stue-ue", label: "Stue", x: 104, y: 124, w: 224, h: 136 },
    { id: "soverom-2-ue", label: "Soverom 2", x: 332, y: 124, w: 160, h: 136 },
    { id: "soverom-3-ue", label: "Soverom 3", x: 104, y: 264, w: 128, h: 118 },
    { id: "terrasse-ue", label: "Terrasse", x: 236, y: 264, w: 256, h: 118 },
  ],
};

// Stueetasje: VERANDA, ENTRE, SOVEROM, BALKONG, BAD, MAL/STUE, KJØKKEN, STUE, TERRASSE
const stueetasje: FloorPlanDef = {
  floor: "stueetasje",
  viewBox: "0 0 500 390",
  rooms: [
    { id: "veranda-se", label: "Veranda", x: 8, y: 8, w: 92, h: 142 },
    { id: "entre", label: "Entré", x: 104, y: 8, w: 92, h: 92 },
    { id: "soverom-se", label: "Soverom", x: 200, y: 8, w: 140, h: 92 },
    { id: "balkong", label: "Balkong", x: 344, y: 8, w: 148, h: 92 },
    { id: "bad-se", label: "Bad", x: 104, y: 104, w: 92, h: 78 },
    { id: "mal-stue", label: "Mal/Stue", x: 8, y: 154, w: 92, h: 108 },
    { id: "kjokken", label: "Kjøkken", x: 300, y: 104, w: 192, h: 128 },
    { id: "stue-se", label: "Stue", x: 104, y: 186, w: 192, h: 76 },
    { id: "terrasse-se", label: "Terrasse", x: 8, y: 266, w: 484, h: 116 },
  ],
};

export const FLOOR_PLANS: Record<Floor, FloorPlanDef> = {
  overetasje,
  underetasje,
  stueetasje,
  ute: { floor: "ute", viewBox: "0 0 400 200", rooms: [] },
};

export function getRoomsForFloor(floor: Floor): RoomDef[] {
  return FLOOR_PLANS[floor]?.rooms ?? [];
}
