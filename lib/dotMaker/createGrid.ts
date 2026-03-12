export type GridCell = {
  color: string;
};

export type GridRow = {
  checked: boolean;
  cells: GridCell[];
};

export function createGrid(rows: number, cols: number): GridRow[] {
  return Array.from({ length: rows }, () => ({
    checked: false,
    cells: Array.from({ length: cols }, () => ({
      color: "#ffffff",
    })),
  }));
}