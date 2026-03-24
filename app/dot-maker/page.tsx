"use client";

import { useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import Header from "@/components/layout/Header";
import DotGrid from "@/components/dot-maker/DotGrid";
import { createGrid, type GridRow } from "@/lib/dotMaker/createGrid";
import { isStoredWorkItem, readStoredWorkItems, writeStoredWorkItems } from "@/lib/my-work-storage";

function cloneGrid(grid: GridRow[]) {
  return grid.map((row) => ({
    ...row,
    cells: row.cells.map((cell) => ({ ...cell })),
  }));
}

function countColoredCells(grid: GridRow[]) {
  return grid.reduce(
    (acc, row) => acc + row.cells.filter((cell) => cell.color.toLowerCase() !== "#ffffff").length,
    0
  );
}

export default function DotMakerPage() {
  const [rows, setRows] = useState("20");
  const [cols, setCols] = useState("20");
  const [grid, setGrid] = useState<GridRow[]>([]);
  const [selectedColor, setSelectedColor] = useState("#222222");
  const [workTitle, setWorkTitle] = useState("");
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

  function pushHistorySnapshot(sourceGrid: GridRow[]) {
    if (hasSavedSnapshot) return;
    setHistory((prev) => [...prev, cloneGrid(sourceGrid)]);
    setHasSavedSnapshot(true);
  }

  function handleCreateGrid() {
    const rowCount = Number(rows);
    const colCount = Number(cols);

    if (!Number.isInteger(rowCount) || !Number.isInteger(colCount) || rowCount <= 0 || colCount <= 0) {
      alert("행과 열에는 1 이상의 숫자를 입력해 주세요.");
      return;
    }

    if (rowCount > 200 || colCount > 200) {
      alert("너무 큰 도트판은 느려질 수 있어서 200 이하로 입력해 주세요.");
      return;
    }

    setGrid(createGrid(rowCount, colCount));
    setHistory([]);
    setIsPainting(false);
    setHasSavedSnapshot(false);
  }

  function paintCell(rowIndex: number, colIndex: number, mode: "toggle" | "paint") {
    setGrid((prev) => {
      if (prev.length === 0) return prev;

      pushHistorySnapshot(prev);

      return prev.map((row, rIdx) => {
        if (rIdx !== rowIndex) return row;

        return {
          ...row,
          cells: row.cells.map((cell, cIdx) => {
            if (cIdx !== colIndex) return cell;

            const sameColor = cell.color.toLowerCase() === selectedColor.toLowerCase();
            const nextColor = mode === "toggle" ? (sameColor ? "#ffffff" : selectedColor) : selectedColor;

            if (cell.color.toLowerCase() === nextColor.toLowerCase()) {
              return cell;
            }

            return { ...cell, color: nextColor };
          }),
        };
      });
    });
  }

  function handleToggleRowCheck(rowIndex: number) {
    setGrid((prev) => {
      if (prev.length === 0) return prev;

      setHistory((historyPrev) => [...historyPrev, cloneGrid(prev)]);

      return prev.map((row, rIdx) =>
        rIdx === rowIndex
          ? {
              ...row,
              checked: !row.checked,
            }
          : row
      );
    });

    setHasSavedSnapshot(false);
  }

  function handleResetAll() {
    setGrid((prev) => {
      if (prev.length === 0) return prev;

      setHistory((historyPrev) => [...historyPrev, cloneGrid(prev)]);

      return prev.map((row) => ({
        ...row,
        checked: false,
        cells: row.cells.map((cell) => ({
          ...cell,
          color: "#ffffff",
        })),
      }));
    });

    setIsPainting(false);
    setHasSavedSnapshot(false);
  }

  function handleUndo() {
    setHistory((prev) => {
      if (prev.length === 0) return prev;

      const last = prev[prev.length - 1];
      setGrid(cloneGrid(last));
      return prev.slice(0, -1);
    });

    setIsPainting(false);
    setHasSavedSnapshot(false);
  }

  async function handleExportPng() {
    if (!exportRef.current || grid.length === 0) {
      alert("먼저 도트판을 만든 뒤 내보내기를 해 주세요.");
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
      alert("PNG 저장 중 오류가 발생했어요.");
    }
  }

  function handleAddToMyWork() {
    if (grid.length === 0) {
      alert("먼저 도트판을 만들어 주세요.");
      return;
    }

    const trimmedTitle = workTitle.trim();
    if (!trimmedTitle) {
      alert("작품명을 입력해 주세요.");
      return;
    }

    const coloredCount = countColoredCells(grid);
    const today = new Date().toISOString().slice(0, 10);

    const draftItem = {
      id: `dot-${Date.now()}`,
      title: trimmedTitle,
      progress: "진행 중",
      yarn: "도트메이커 작업",
      note: `${rows} x ${cols} 도트 작업, 색칠된 칸 ${coloredCount}개`,
      needle: "해당 없음",
      startedAt: today,
      updatedAt: today,
      detail: `도트메이커에서 만든 작업이에요. 격자 크기는 ${rows} x ${cols}이고, 현재 색칠된 칸은 ${coloredCount}개예요.`,
      checklist: [
        "도트메이커에서 초안 생성",
        `${rows} x ${cols} 격자 설정`,
        `색칠된 칸 ${coloredCount}개 확인`,
      ],
      source: "local" as const,
    };

    if (!isStoredWorkItem(draftItem)) {
      alert("작업기록 형식이 올바르지 않아 저장하지 못했어요.");
      return;
    }

    const next = [draftItem, ...readStoredWorkItems()];
    writeStoredWorkItems(next);
    alert("작업기록에 추가했어요.");
    setWorkTitle("");
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <Header />

        <div className="mb-8 mt-10">
          <h1 className="text-3xl font-black md:text-4xl">도트메이커</h1>
          <p className="mt-2 text-slate-600">
            행과 열을 정한 뒤 색을 선택해서 도안을 빠르게 스케치해 보세요.
          </p>
        </div>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min={1}
                value={rows}
                onChange={(event) => setRows(event.target.value)}
                className="w-24 rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-semibold outline-none focus:border-violet-400"
                placeholder="행"
              />

              <span className="text-xl font-bold text-slate-500">x</span>

              <input
                type="number"
                min={1}
                value={cols}
                onChange={(event) => setCols(event.target.value)}
                className="w-24 rounded-2xl border border-slate-300 px-4 py-3 text-center text-lg font-semibold outline-none focus:border-violet-400"
                placeholder="열"
              />

              <button
                type="button"
                onClick={handleCreateGrid}
                className="rounded-2xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200"
              >
                판 만들기
              </button>

              <button
                type="button"
                onClick={handleUndo}
                disabled={history.length === 0}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                되돌리기
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                disabled={grid.length === 0}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                전체 초기화
              </button>

              <button
                type="button"
                onClick={handleExportPng}
                disabled={grid.length === 0}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                PNG 저장
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
              <label className="text-sm font-medium text-slate-700">색상 선택</label>

              <input
                type="color"
                value={selectedColor}
                onChange={(event) => setSelectedColor(event.target.value)}
                className="h-11 w-16 cursor-pointer rounded-lg border border-slate-300 bg-white p-1"
              />

              <div
                className="h-8 w-8 rounded-md border border-slate-300 shadow-sm"
                style={{ backgroundColor: selectedColor }}
              />

              <span className="text-sm font-medium text-slate-600">{selectedColor}</span>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl bg-emerald-50 px-4 py-4 md:flex-row md:items-center">
              <input
                type="text"
                value={workTitle}
                onChange={(event) => setWorkTitle(event.target.value)}
                placeholder="작업기록에 저장할 작품명"
                className="w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-400 md:max-w-sm"
              />

              <button
                type="button"
                onClick={handleAddToMyWork}
                disabled={grid.length === 0}
                className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
              >
                작업기록에 추가
              </button>

              <p className="text-sm text-emerald-800/80">
                현재 도트 작업을 작업기록 페이지로 저장할 수 있어요.
              </p>
            </div>
          </div>

          <DotGrid
            ref={exportRef}
            grid={grid}
            selectedColor={selectedColor}
            onCellMouseDown={(rowIndex, colIndex) => {
              setIsPainting(true);
              paintCell(rowIndex, colIndex, "toggle");
            }}
            onCellMouseEnter={(rowIndex, colIndex) => {
              if (!isPainting) return;
              paintCell(rowIndex, colIndex, "paint");
            }}
            onCellTouchStart={(rowIndex, colIndex) => {
              setIsPainting(true);
              paintCell(rowIndex, colIndex, "toggle");
            }}
            onCellTouchMove={(rowIndex, colIndex) => {
              if (!isPainting) return;
              paintCell(rowIndex, colIndex, "paint");
            }}
            onToggleRowCheck={handleToggleRowCheck}
          />
        </section>
      </div>
    </main>
  );
}
