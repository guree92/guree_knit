export type NeedleType = "코바늘" | "대바늘";

export type DetailSymbol = {
  key: string;
  label: string;
  insert: string;
};

export type DetailRow = {
  id: string;
  rowNumber: number;
  instruction: string;
  collapsed: boolean;
};

export const crochetSymbols: DetailSymbol[] = [
  { key: "ch", label: "사슬코 (ch)", insert: "ch" },
  { key: "sc", label: "짧은뜨기 (sc)", insert: "sc" },
  { key: "hdc", label: "긴뜨기 (hdc)", insert: "hdc" },
  { key: "dc", label: "한길긴뜨기 (dc)", insert: "dc" },
  { key: "tr", label: "두길긴뜨기 (tr)", insert: "tr" },
  { key: "inc", label: "코늘림 (inc)", insert: "inc" },
  { key: "dec", label: "코줄임 (dec)", insert: "dec" },
  { key: "tog", label: "2코 모아뜨기 (tog)", insert: "tog" },
  { key: "mr", label: "매직링 (MR)", insert: "MR" },
  { key: "sl st", label: "빼뜨기 (sl st)", insert: "sl st" },
  { key: "turn", label: "되돌아뜨기 (TURN)", insert: "TURN" },
];

export const knitSymbols: DetailSymbol[] = [
  { key: "k", label: "겉뜨기 (K)", insert: "K" },
  { key: "p", label: "안뜨기 (P)", insert: "P" },
  { key: "kfb", label: "코늘림 (KFB)", insert: "KFB" },
  { key: "m1l", label: "왼코늘림 (M1L)", insert: "M1L" },
  { key: "m1r", label: "오른코늘림 (M1R)", insert: "M1R" },
  { key: "yo", label: "감아코 (YO)", insert: "YO" },
  { key: "k2tog", label: "겉뜨기 코줄임 (K2tog)", insert: "K2tog" },
  { key: "p2tog", label: "안뜨기 코줄임 (P2tog)", insert: "P2tog" },
  { key: "turn", label: "되돌아뜨기 (TURN)", insert: "TURN" },
  { key: "sl", label: "코빼기 (sl)", insert: "sl" },
  { key: "co", label: "코잡기 (CO)", insert: "CO" },
  { key: "bo", label: "코막기 (BO)", insert: "BO" },
  { key: "cable", label: "꽈배기 (cable)", insert: "cable" },
];

function makeDetailRowId() {
  return `detail-row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeRowNumber(rowNumber: number, fallback: number) {
  return Number.isFinite(rowNumber) && rowNumber > 0 ? Math.floor(rowNumber) : fallback;
}

export function getDetailSymbols(needleType: NeedleType) {
  return needleType === "대바늘" ? knitSymbols : crochetSymbols;
}

export function createDetailRow(rowNumber: number): DetailRow {
  return {
    id: makeDetailRowId(),
    rowNumber: normalizeRowNumber(rowNumber, 1),
    instruction: "",
    collapsed: false,
  };
}

export function createDetailRows(count: number, startRowNumber = 1): DetailRow[] {
  return Array.from({ length: count }, (_, index) => createDetailRow(startRowNumber + index));
}

export function renumberDetailRows(rows: DetailRow[]) {
  return rows.map((row, index) => ({
    ...row,
    id: row.id || makeDetailRowId(),
    rowNumber: normalizeRowNumber(row.rowNumber, index + 1),
  }));
}

export function serializeDetailRows(rows: DetailRow[]) {
  return renumberDetailRows(rows).map((row) => ({
    id: row.id,
    rowNumber: row.rowNumber,
    instruction: row.instruction.trim(),
    collapsed: Boolean(row.collapsed),
  }));
}

export function buildDetailContent(rows: DetailRow[]) {
  return serializeDetailRows(rows)
    .filter((row) => row.instruction)
    .map((row) => `${row.rowNumber}단\n${row.instruction}`)
    .join("\n\n");
}

export function normalizeDetailRows(value: unknown, fallbackContent?: string | null): DetailRow[] {
  if (Array.isArray(value)) {
    const normalized = value
      .filter((item) => item && typeof item === "object")
      .map((item, index) => {
        const row = item as Partial<DetailRow>;
        return {
          id: typeof row.id === "string" && row.id ? row.id : makeDetailRowId(),
          rowNumber:
            typeof row.rowNumber === "number"
              ? normalizeRowNumber(row.rowNumber, index + 1)
              : index + 1,
          instruction: typeof row.instruction === "string" ? row.instruction : "",
          collapsed: Boolean(row.collapsed),
        };
      });

    if (normalized.length > 0) {
      return normalized;
    }
  }

  if (fallbackContent?.trim()) {
    const chunks = fallbackContent
      .split(/\n\s*\n/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (chunks.length > 0) {
      return chunks.map((chunk, index) => {
        const lines = chunk
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const firstLine = lines[0] ?? "";
        const matched = firstLine.match(/^(\d+)\s*단/);
        const rowNumber = matched ? Number(matched[1]) : index + 1;
        const rest = matched ? lines.slice(1) : lines;

        return {
          id: makeDetailRowId(),
          rowNumber,
          instruction: rest.join(" "),
          collapsed: false,
        };
      });
    }
  }

  return [];
}

function sumStitches(instruction: string, needleType: NeedleType): number | null {
  const lowered = instruction.toLowerCase();
  if (!lowered) return null;

  const symbolCounts =
    needleType === "대바늘"
      ? {
          k: 1,
          p: 1,
          kfb: 2,
          m1l: 1,
          m1r: 1,
          yo: 1,
          k2tog: 1,
          p2tog: 1,
          turn: 0,
          sl: 1,
          co: 1,
          bo: 1,
          cable: 1,
        }
      : {
          ch: 1,
          sc: 1,
          hdc: 1,
          dc: 1,
          tr: 1,
          inc: 2,
          dec: 1,
          tog: 1,
          mr: 0,
          "sl st": 1,
          turn: 0,
        };

  let total = 0;
  let matched = false;
  const repeatPattern = /\*([^*]+)\*\s*x\s*(\d+)/gi;
  let remaining = lowered;

  remaining = remaining.replace(repeatPattern, (_, chunk: string, repeat: string) => {
    const inner = sumStitches(chunk, needleType);
    if (inner !== null) {
      total += inner * Number(repeat);
      matched = true;
    }
    return " ";
  });

  Object.entries(symbolCounts).forEach(([symbol, value]) => {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const multiplierRegex = new RegExp(
      `(^|[^a-z])${escaped}\\s*\\*\\s*(\\d+)(?=[^a-z]|$)`,
      "gi"
    );

    remaining = remaining.replace(multiplierRegex, (_match, prefix: string, repeat: string) => {
      total += value * Number(repeat);
      matched = true;
      return `${prefix} `;
    });
  });

  Object.entries(symbolCounts).forEach(([symbol, value]) => {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-z])${escaped}(?=[^a-z]|$)`, "gi");
    const occurrences = remaining.match(regex)?.length ?? 0;
    if (occurrences > 0) {
      total += occurrences * value;
      matched = true;
    }
  });

  return matched ? total : null;
}

export function estimateStitchHint(instruction: string, needleType: NeedleType) {
  const total = sumStitches(instruction, needleType);
  return total === null ? null : `예상 코 수: ${total}코`;
}
