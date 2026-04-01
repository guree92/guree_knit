"use client";

import Link from "next/link";
import { Suspense, useLayoutEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./verified.module.css";

function SignupVerifiedPageContent() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") ?? undefined;
  const isSuccess = verified !== "0";

  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    const previousPadding = document.body.style.padding;
    const previousBackground = document.body.style.background;
    const previousBackgroundColor = document.body.style.backgroundColor;
    const previousHtmlBackgroundColor = document.documentElement.style.backgroundColor;

    document.body.classList.add("verified-page-mode");
    document.documentElement.classList.add("verified-page-mode");
    document.body.style.padding = "0";
    document.body.style.background = "#f3f4f6";
    document.body.style.backgroundColor = "#f3f4f6";
    document.documentElement.style.backgroundColor = "#f3f4f6";

    return () => {
      document.body.classList.remove("verified-page-mode");
      document.documentElement.classList.remove("verified-page-mode");
      document.body.style.padding = previousPadding;
      document.body.style.background = previousBackground;
      document.body.style.backgroundColor = previousBackgroundColor;
      document.documentElement.style.backgroundColor = previousHtmlBackgroundColor;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <div className={isSuccess ? styles.successIcon : styles.failIcon} aria-hidden="true">
            {isSuccess ? "✓" : "!"}
          </div>

          <h1 className={styles.title}>
            {isSuccess ? "이메일 인증이 완료되었어요" : "이메일 인증에 실패했어요"}
          </h1>

          <p className={styles.description}>
            {isSuccess
              ? "이제 로그인할 수 있어요."
              : "인증 링크가 만료되었거나 올바르지 않아요. 다시 회원가입 후 인증해 주세요."}
          </p>

          <div className={styles.buttonGroup}>
            <Link
              href="/login"
              className={styles.primaryButton}
            >
              로그인하러 가기
            </Link>
            <Link
              href="/signup"
              className={styles.secondaryButton}
            >
              회원가입으로 돌아가기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function SignupVerifiedPage() {
  return (
    <Suspense fallback={null}>
      <SignupVerifiedPageContent />
    </Suspense>
  );
}
