"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Header from "@/components/layout/Header";
import DotGrid from "@/components/dot-maker/DotGrid";
import { createGrid, type GridRow } from "@/lib/dotMaker/createGrid";

function cloneGrid(grid: GridRow[]) {
  return grid.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => ({ ...cell })),
  }));
}

export default function DotMakerPage() {
  const [rows, setRows] = useState("20");
  const [cols, setCols] = useState("20");
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [selectedColor, setSelectedColor] = useState("#222222");

  const [isPainting, setIsPainting] = useState(false);
  const [hasSavedSnapshot, setHasSavedSnapshot] = useState(false);
  const [history, setHistory] = useState<GridRow[][]>([]);

  const exportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const stopPainting = () => {
      setIsPainting(false);
      setHasSavedSnapshot(false);
    };

    window.addEventListener("mouseup", stopPainting);
    window.addEventListener("touchend", stopPainting);

    return () => {
      window.removeEventListener("mouseup", stopPainting);
      window.removeEventListener("touchend", stopPainting);
    };
  }, []);

  const pushHistorySnapshot = (sourceGrid: GridRow[]) => {
    if (hasSavedSnapshot) return;
    setHistory((prev) => [...prev, cloneGrid(sourceGrid)]);
    setHasSavedSnapshot(true);
  };

  const handleCreateGrid = () => {
    const rowCount = Number(rows);
    const colCount = Number(cols);

    if (
      !Number.isInteger(rowCount) ||
      !Number.isInteger(colCount) ||
      rowCount <= 0 ||
      colCount <= 0
    ) {
      alert("행과 열에는 1 이상의 숫자를 입력해줘.");
      return;
    }

    if (rowCount > 200 || colCount > 200) {
      alert("너무 큰 표는 어려워서 200 이하로 입력해줘.");
      return;
    }

    setGrid(createGrid(rowCount, colCount));
    setHistory([]);
    setIsPainting(false);
    setHasSavedSnapshot(false);
  };

  const paintCell = (
    rowIndex: number,
    colIndex: number,
    mode: "toggle" | "paint"
  ) => {
    setGrid((prev) => {
      if (prev.length === 0) return prev;

      pushHistorySnapshot(prev);

      return prev.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;

        return {
          ...row,
          cells: row.cells.map((cell, cIdx) => {
            if (cIdx !== colIndex) return cell;

            const sameColor =
              cell.color.toLowerCase() === selectedColor.toLowerCase();

            const nextColor =
              mode === "toggle"
                ? sameColor
                  ? "#ffffff"
                  : selectedColor
                : selectedColor;

            if (cell.color.toLowerCase() === nextColor.toLowerCase()) {
              return cell;
            }

            return {
              ...cell,
              color: nextColor,
            };
          }),
        };
      });
    });
  };

  const handleCellMouseDown = (rowIndex: number, colIndex: number) => {
    setIsPainting(true);
    paintCell(rowIndex, colIndex, "toggle");
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (!isPainting) return;
    paintCell(rowIndex, colIndex, "paint");
  };

  const handleTouchPaint = (rowIndex: number, colIndex: number) => {
    if (!isPainting) return;
    paintCell(rowIndex, colIndex, "paint");
  };

  const handleTouchStartCell = (rowIndex: number, colIndex: number) => {
    setIsPainting(true);
    paintCell(rowIndex, colIndex, "toggle");
  };

  const handleToggleRowCheck = (rowIndex: number) => {
    setGrid((prev) => {
      if (prev.length === 0) return prev;

      setHistory((historyPrev) => [...historyPrev, cloneGrid(prev)]);

      return prev.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;
        return {
          ...row,
          checked: !row.checked,
        };
      });
    });
  };

  const handleUndo = () => {
    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const last = prev[prev.length - 1];
      setGrid(cloneGrid(last));
      return prev.slice(0, -1);
    });

    setIsPainting(false);
    setHasSavedSnapshot(false);
  };

  const handleExportPng = async () => {
    if (!exportRef.current || grid.length === 0) {
      alert("먼저 표를 만든 뒤 내보내기 해줘.");
      return;
    }

    try {
      const dataUrl = await toPng(exportRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const link = document.createElement("a");
      link.download = `dot-maker-${rows}x${cols}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error(error);
      alert("PNG 저장 중 오류가 발생했어.");
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <Header />

        <div className="mb-8 mt-10">
          <h1 className="text-3xl font-black md:text-4xl">도트메이커</h1>
          <p className="mt-2 text-slate-600">
            숫자를 입력해서 표를 만들고, 원하는 색으로 클릭·드래그·터치해서
            도트를 찍어보자.
          </p>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                value={rows}
                onChange={(e) => setRows(e.target.value)}
                className="w-24 rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-semibold outline-none focus:border-violet-400"
                placeholder="행"
              />

              <span className="text-xl font-bold text-slate-500">×</span>

              <input
                type="number"
                min={1}
                value={cols}
                onChange={(e) => setCols(e.target.value)}
                className="w-24 rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-semibold outline-none focus:border-violet-400"
                placeholder="열"
              />

              <button
                onClick={handleCreateGrid}
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200"
              >
                표 만들기
              </button>

              <button
                onClick={handleUndo}
                disabled={history.length === 0}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                뒤로가기
              </button>

              <button
                onClick={handleExportPng}
                disabled={grid.length === 0}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                PNG 저장
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <label className="text-sm font-medium text-slate-700">
                색상 선택
              </label>

              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
              />

              <div
                className="h-8 w-8 rounded-md border border-slate-300"
                style={{ backgroundColor: selectedColor }}
              />

              <span className="text-sm text-slate-600">{selectedColor}</span>
            </div>
          </div>

          <DotGrid
            ref={exportRef}
            grid={grid}
            selectedColor={selectedColor}
            onCellMouseDown={handleCellMouseDown}
            onCellMouseEnter={handleCellMouseEnter}
            onCellTouchStart={handleTouchStartCell}
            onCellTouchMove={handleTouchPaint}
            onToggleRowCheck={handleToggleRowCheck}
          />
        </section>
      </div>
    </main>
  );
}