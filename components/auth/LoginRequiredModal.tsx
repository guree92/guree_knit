"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import styles from "./LoginRequiredModal.module.css";

type LoginRequiredModalProps = {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
};

export default function LoginRequiredModal({
  open,
  title = "로그인이 필요해요",
  description = "먼저 로그인을 해주세요.",
  onClose,
}: LoginRequiredModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        onClick={(event) => event.stopPropagation()}
      >
        <p className={styles.eyebrow}>Login Required</p>
        <h2 id="login-required-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              onClose();
              router.push("/login");
            }}
          >
            로그인하기
          </button>
        </div>
      </div>
    </div>
  );
}
