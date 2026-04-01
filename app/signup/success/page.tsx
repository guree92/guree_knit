"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./success.module.css";

function SignupSuccessPageContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? undefined;
  const nickname = searchParams.get("nickname") ?? undefined;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.classList.add("success-page-mode");
    document.documentElement.classList.add("success-page-mode");

    return () => {
      document.body.classList.remove("success-page-mode");
      document.documentElement.classList.remove("success-page-mode");
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <div className={styles.hero}>
            <div className={styles.icon}>✉️</div>
            <p className={styles.kicker}>Email Verification</p>
            <h1 className={styles.title}>
              {nickname ? `${nickname}님, 마지막 단계예요` : "회원가입 마지막 단계예요"}
            </h1>
            <p className={styles.subtitle}>
              아래 메일함에서 인증 링크를 눌러주면 계정이 바로 활성화돼요.
            </p>
          </div>

          <div className={styles.emailBox}>
            <p className={styles.emailLabel}>인증 메일 전송 주소</p>
            <p className={styles.emailValue}>
              {email ?? "입력한 이메일 주소"}
            </p>
          </div>

          <div className={styles.buttonGroup}>
            <Link
              href="/login"
              className={styles.primaryButton}
            >
              인증 후 로그인하러 가기
            </Link>

            <Link
              href="/"
              className={styles.secondaryButton}
            >
              홈으로 돌아가기
            </Link>
          </div>

          <p className={styles.tip}>
            메일이 안 보이면 스팸함, 프로모션함을 확인하고 1~2분 뒤 다시 확인해 주세요.
          </p>
        </section>
      </div>
    </main>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SignupSuccessPageContent />
    </Suspense>
  );
}
