import { forwardRef } from "react";
import type { TouchEvent } from "react";
import type { GridRow } from "@/lib/dotMaker/createGrid";

type DotGridProps = {
  grid: GridRow[];
  selectedColor: string;
  onCellMouseDown: (rowIndex: number, colIndex: number) => void;
  onCellMouseEnter: (rowIndex: number, colIndex: number) => void;
  onCellTouchStart: (rowIndex: number, colIndex: number) => void;
  onCellTouchMove: (rowIndex: number, colIndex: number) => void;
  onToggleRowCheck: (rowIndex: number) => void;
};

const DotGrid = forwardRef<HTMLDivElement, DotGridProps>(function DotGrid(
  {
    grid,
    selectedColor,
    onCellMouseDown,
    onCellMouseEnter,
    onCellTouchStart,
    onCellTouchMove,
    onToggleRowCheck,
  },
  ref
) {
  if (grid.length === 0) {
    return (
      <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-slate-500">
        아직 만들어진 표가 없어. 위에 숫자를 입력해서 시작해줘.
      </div>
    );
  }

  const colCount = grid[0]?.cells.length ?? 0;

  const handleCellTouchMove = (e: TouchEvent<HTMLButtonElement>) => {
    const touch = e.touches[0];
    if (!touch) return;

    const el = document.elementFromPoint(
      touch.clientX,
      touch.clientY
    ) as HTMLElement | null;

    if (!el) return;

    const row = el.dataset.row;
    const col = el.dataset.col;

    if (row == null || col == null) return;

    onCellTouchMove(Number(row), Number(col));
  };

  return (
    <div className="mt-8 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center gap-3 text-sm text-slate-600">
        <span>현재 선택 색상</span>
        <div
          className="h-8 w-8 rounded-md border border-slate-300"
          style={{ backgroundColor: selectedColor }}
        />
        <span className="font-medium">{selectedColor}</span>
      </div>

      <div ref={ref} className="w-fit bg-white p-0">
        {grid.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-stretch">
            <div className="relative">
              <div
                className="grid border-x border-t border-slate-500"
                style={{
                  gridTemplateColumns: `repeat(${colCount}, 24px)`,
                }}
              >
                {row.cells.map((cell, colIndex) => (
                  <button
                    key={`${rowIndex}-${colIndex}`}
                    type="button"
                    data-row={rowIndex}
                    data-col={colIndex}
                    onMouseDown={() => onCellMouseDown(rowIndex, colIndex)}
                    onMouseEnter={() => onCellMouseEnter(rowIndex, colIndex)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      onCellTouchStart(rowIndex, colIndex);
                    }}
                    onTouchMove={(e) => {
                      e.preventDefault();
                      handleCellTouchMove(e);
                    }}
                    className="h-6 w-6 select-none border-r border-b border-slate-500 bg-white"
                    style={{ backgroundColor: cell.color, touchAction: "none" }}
                    aria-label={`${rowIndex + 1}행 ${colIndex + 1}열 색칠`}
                  />
                ))}
              </div>

              {row.checked && (
                <div className="pointer-events-none absolute left-0 right-0 top-1/2 z-10 h-[2px] -translate-y-1/2 bg-rose-600" />
              )}
            </div>

            <label className="flex min-w-10 items-center justify-center border border-l-0 border-slate-500 bg-white px-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={row.checked}
                onChange={() => onToggleRowCheck(rowIndex)}
                className="h-4 w-4 cursor-pointer"
                aria-label={`${rowIndex + 1}행 완료 체크`}
              />
            </label>
          </div>
        ))}

        <div className="flex">
          <div
            className="grid border-x border-t border-slate-500"
            style={{
              gridTemplateColumns: `repeat(${colCount}, 24px)`,
            }}
          >
            {Array.from({ length: colCount }).map((_, colIndex) => {
              const fromRight = colCount - colIndex;
              const label = fromRight % 5 === 0 ? String(fromRight) : "";

              return (
                <div
                  key={`guide-${colIndex}`}
                  className="flex h-8 items-center justify-center border-r border-b border-slate-500 bg-white text-[11px] font-semibold text-slate-600"
                >
                  {label}
                </div>
              );
            })}
          </div>

          <div className="min-w-10 border border-l-0 border-slate-500 bg-white" />
        </div>
      </div>
    </div>
  );
});

export default DotGrid;