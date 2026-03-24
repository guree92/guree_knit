"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { subscribeToMediaQuery } from "@/lib/media-query";
import styles from "./login.module.css";
import headerLogo from "../../Image/headerlogo.png";

function getSafeReturnTo(value: string | null) {
  if (!value) return "/";
  if (!value.startsWith("/")) return "/";
  if (value.startsWith("//")) return "/";
  return value;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    const mediaQuery = window.matchMedia("(max-width: 640px), (max-height: 760px)");

    const syncOverflow = () => {
      document.body.style.overflow = mediaQuery.matches ? "auto" : "hidden";
    };

    syncOverflow();
    const unsubscribe = subscribeToMediaQuery(mediaQuery, syncOverflow);

    return () => {
      unsubscribe();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("로그인에 실패했어요. 이메일과 비밀번호를 다시 확인해 주세요.");
        return;
      }

      setMessage("로그인에 성공했어요.");
      router.push(getSafeReturnTo(searchParams.get("returnTo")));
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("로그인 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <Image src={headerLogo} alt="Knit.GUREE" priority className={styles.logo} />
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <input
              id="email"
              type="email"
              placeholder="knitter@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className={styles.input}
            />

            <div className={styles.passwordField}>
              <div className={styles.passwordShell}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className={styles.passwordInput}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className={styles.toggleButton}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {message ? <p className={styles.message}>{message}</p> : null}

            <div className={styles.buttonGroup}>
              <button type="submit" disabled={loading} className={styles.primaryButton}>
                {loading ? "로그인 중..." : "로그인하기"}
              </button>

              <div className={styles.inlineLinks}>
                <Link href="/terms" className={styles.inlineLink}>
                  회원가입
                </Link>
                <Link href="#" className={styles.inlineLink}>
                  아이디 · 비밀번호 찾기
                </Link>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
