export interface CourtColor {
  bg: string;
  text: string;
  dot: string;
}

// 12 visually distinct hues — enough headroom for most clubs before any two
// courts have to share a color.
const PALETTE: CourtColor[] = [
  { bg: "bg-violet-100", text: "text-violet-800", dot: "bg-violet-400" },
  { bg: "bg-emerald-100", text: "text-emerald-800", dot: "bg-emerald-400" },
  { bg: "bg-sky-100", text: "text-sky-800", dot: "bg-sky-400" },
  { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-400" },
  { bg: "bg-rose-100", text: "text-rose-800", dot: "bg-rose-400" },
  { bg: "bg-teal-100", text: "text-teal-800", dot: "bg-teal-400" },
  { bg: "bg-indigo-100", text: "text-indigo-800", dot: "bg-indigo-400" },
  { bg: "bg-lime-100", text: "text-lime-800", dot: "bg-lime-400" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-800", dot: "bg-fuchsia-400" },
  { bg: "bg-cyan-100", text: "text-cyan-800", dot: "bg-cyan-400" },
  { bg: "bg-orange-100", text: "text-orange-800", dot: "bg-orange-400" },
  { bg: "bg-pink-100", text: "text-pink-800", dot: "bg-pink-400" },
];

const FALLBACK_COLOR: CourtColor = { bg: "bg-slate-100", text: "text-slate-800", dot: "bg-slate-400" };

// Assigns each court a color by its position in the club's court list (stable
// creation order from the backend), so colors don't collide the way a
// name-hash could and stay consistent across every view that shows courts.
export function buildCourtColorMap(courtNames: string[]): Map<string, CourtColor> {
  const map = new Map<string, CourtColor>();
  courtNames.forEach((name, i) => map.set(name, PALETTE[i % PALETTE.length]));
  return map;
}

export function courtColorFrom(map: Map<string, CourtColor>, name: string): CourtColor {
  return map.get(name) ?? FALLBACK_COLOR;
}
