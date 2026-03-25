"use client";

import { Fragment, useMemo, useState } from "react";
import {
  createDetailRow,
  estimateStitchHint,
  getDetailSymbols,
  renumberDetailRows,
  type DetailRow,
  type NeedleType,
} from "@/lib/pattern-detail";
import styles from "./PatternDetailEditor.module.css";

type PatternDetailEditorProps = {
  needleType: NeedleType;
  rows: DetailRow[];
  onChange: (rows: DetailRow[]) => void;
  textValue: string;
  onTextValueChange: (value: string) => void;
  hideTextBoard?: boolean;
};

function extractCurrentToken(value: string) {
  const parts = value.trim().split(/[\s,()*]+/).filter(Boolean);
  return parts.at(-1)?.toLowerCase() ?? "";
}

function buildHighlightedInstruction(instruction: string, symbols: string[]) {
  if (!instruction.trim()) return null;

  const tokenSet = new Set(symbols.map((symbol) => symbol.toLowerCase()));
  const multiplierPattern = new RegExp(
    `(${symbols
      .map((symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})\\s*\\*\\s*\\d+`,
    "gi"
  );
  const parts = instruction.split(/(\s+|,\s*|\(\s*|\)\s*)/);

  return parts.map((part, index) => {
    const trimmed = part.trim();
    const normalized = trimmed.toLowerCase();

    if (trimmed && multiplierPattern.test(trimmed)) {
      multiplierPattern.lastIndex = 0;
      return (
        <span key={`${part}-${index}`} className={styles.token}>
          {trimmed}
        </span>
      );
    }

    if (normalized && tokenSet.has(normalized)) {
      return (
        <span key={`${part}-${index}`} className={styles.token}>
          {trimmed}
        </span>
      );
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

export default function PatternDetailEditor({
  needleType,
  rows,
  onChange,
  textValue,
  onTextValueChange,
  hideTextBoard = false,
}: PatternDetailEditorProps) {
  const symbols = useMemo(() => getDetailSymbols(needleType), [needleType]);
  const [draftInstruction, setDraftInstruction] = useState("");
  const [draftRowNumber, setDraftRowNumber] = useState(() => String(rows.length + 1 || 1));

  const currentToken = extractCurrentToken(draftInstruction);
  const suggestions = currentToken
    ? symbols.filter((symbol) => symbol.key.startsWith(currentToken)).slice(0, 6)
    : [];
  const stitchHint = estimateStitchHint(draftInstruction, needleType);

  function commitRows(nextRows: DetailRow[]) {
    onChange(renumberDetailRows(nextRows));
  }

  function insertSymbol(insert: string) {
    setDraftInstruction((current) => (current.trim() ? `${current.trim()} ${insert}` : insert));
  }

  function addCurrentRow() {
    if (!draftInstruction.trim()) return;

    const parsedRowNumber = Number.parseInt(draftRowNumber.trim(), 10);
    const rowNumber = Number.isFinite(parsedRowNumber) && parsedRowNumber > 0 ? parsedRowNumber : 1;
    const nextRow = {
      ...createDetailRow(rowNumber),
      instruction: draftInstruction.trim(),
    };

    const nextRows = [...rows, nextRow];
    const nextLine = `${nextRow.rowNumber}단 : ${nextRow.instruction || "-"}`;

    commitRows(nextRows);
    onTextValueChange(textValue.trim() ? `${textValue.trimEnd()}\n${nextLine}` : nextLine);
    setDraftInstruction("");
    setDraftRowNumber(String(rowNumber + 1));
  }

  return (
    <div className={styles.editor}>
      {hideTextBoard ? null : (
        <div className={styles.textSection}>
          <textarea
            className={styles.textBoard}
            value={textValue}
            onChange={(event) => onTextValueChange(event.target.value)}
            placeholder="단 추가를 누르면 이곳에 1단, 2단, 3단 형식으로 쌓이고 자유롭게 수정할 수 있어요."
          />
        </div>
      )}

      <div className={styles.toolbar}>
        <p className={styles.toolbarTitle}>자동입력버튼</p>
        <div className={styles.symbolList}>
          {symbols.map((symbol) => (
            <button
              key={symbol.key}
              type="button"
              className={styles.symbolButton}
              onClick={() => insertSymbol(symbol.insert)}
            >
              {symbol.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.inputSection}>
        <div className={styles.sectionHead}>
          <div className={styles.rowNumberControl}>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              className={styles.rowNumberInput}
              value={draftRowNumber}
              onChange={(event) => {
                const nextValue = event.target.value.replace(/\D/g, "");
                setDraftRowNumber(nextValue);
              }}
              onBlur={() => {
                if (!draftRowNumber.trim()) {
                  setDraftRowNumber("1");
                }
              }}
            />
            <span className={styles.rowNumberSuffix}>단</span>
          </div>
        </div>

        <div className={styles.rowCard}>
          <div className={styles.rowFields}>
            <textarea
              className={styles.textarea}
              value={draftInstruction}
              onChange={(event) => setDraftInstruction(event.target.value)}
              placeholder="예: *sc 1, inc* x6"
            />

            {suggestions.length > 0 ? (
              <div className={styles.suggestions}>
                {suggestions.map((symbol) => (
                  <button
                    key={`suggest-${symbol.key}`}
                    type="button"
                    className={styles.ghostButton}
                    onClick={() => insertSymbol(symbol.insert)}
                  >
                    {symbol.insert}
                  </button>
                ))}
              </div>
            ) : null}

            <div className={styles.preview}>
              {buildHighlightedInstruction(
                draftInstruction,
                symbols.map((symbol) => symbol.key)
              ) || "기호가 들어가면 이곳에서 강조되어 보여요."}
            </div>

            {stitchHint ? <p className={styles.hint}>{stitchHint}</p> : null}
          </div>

          <div className={styles.rowActions}>
            <button
              type="button"
              className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
              onClick={addCurrentRow}
            >
              단 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
