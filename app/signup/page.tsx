"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import styles from "./signup.module.css";

function normalizeNickname(value: string) {
  return value.trim();
}

function isValidNickname(value: string) {
  const nickname = normalizeNickname(value);
  return /^[가-힣a-zA-Z0-9_]{2,12}$/.test(nickname);
}

function removeWhitespace(value: string) {
  return value.replace(/\s/g, "");
}

const blockedNicknameTerms = [
  "시발",
  "씨발",
  "씹",
  "좆",
  "병신",
  "븅신",
  "개새끼",
  "새끼",
  "느금",
  "니애미",
  "니애비",
  "느개비",
  "느금마",
  "느금빠",
  "애미",
  "애비",
  "엠창",
  "앰창",
  "엄창",
  "맘충",
  "한남충",
  "김치녀",
  "미친놈",
  "미친년",
  "걸레년",
  "보지년",
  "창년",
  "창놈",
  "자지",
  "잠지",
  "보지",
  "섹스",
  "성교",
  "자위",
  "딸딸이",
  "야동",
  "애널",
  "오럴",
  "강간",
  "강간범",
  "창녀",
  "걸레",
  "fuck",
  "fuxk",
  "shit",
  "bitch",
  "porn",
  "sex",
  "xnxx",
  "xvideo",
] as const;

function hasBlockedNicknameTerm(value: string) {
  const compact = normalizeNickname(value)
    .toLowerCase()
    .replace(/[\s_.-]/g, "");
  const compactWithoutDigits = compact.replace(/[0-9]/g, "");

  return blockedNicknameTerms.some(
    (term) => compact.includes(term) || compactWithoutDigits.includes(term)
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [nickname, setNickname] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<
    "" | "checking" | "available" | "taken" | "invalid" | "blocked" | "error"
  >("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const normalizedNickname = useMemo(() => normalizeNickname(nickname), [nickname]);
  const isNicknameVerified =
    nicknameStatus === "available" && nicknameChecked === normalizedNickname;

  const nicknameMessage =
    nicknameStatus === "available"
      ? "사용 가능한 닉네임이에요."
      : nicknameStatus === "taken"
        ? "이미 사용 중인 닉네임이에요."
        : nicknameStatus === "invalid"
          ? "닉네임 형식을 다시 확인해 주세요."
          : nicknameStatus === "blocked"
            ? "선정적이거나 부적절한 표현은 닉네임으로 사용할 수 없어요."
          : nicknameStatus === "error"
            ? "중복확인 중 오류가 발생했어요."
            : "";

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const previousBackground = document.body.style.background;
    const previousBackgroundColor = document.body.style.backgroundColor;
    const previousHtmlBackgroundColor = document.documentElement.style.backgroundColor;
    const previousOverflow = document.body.style.overflow;

    document.body.classList.add("signup-page-mode");
    document.documentElement.classList.add("signup-page-mode");
    document.body.style.background = "#f3f4f6";
    document.body.style.backgroundColor = "#f3f4f6";
    document.documentElement.style.backgroundColor = "#f3f4f6";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.classList.remove("signup-page-mode");
      document.documentElement.classList.remove("signup-page-mode");
      document.body.style.background = previousBackground;
      document.body.style.backgroundColor = previousBackgroundColor;
      document.documentElement.style.backgroundColor = previousHtmlBackgroundColor;
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  async function handleCheckNickname() {
    setMessage("");

    const currentNickname = normalizeNickname(nickname);

    if (!currentNickname || !isValidNickname(currentNickname)) {
      setNicknameStatus("invalid");
      return;
    }

    if (hasBlockedNicknameTerm(currentNickname)) {
      setNicknameStatus("blocked");
      setNicknameChecked("");
      return;
    }

    try {
      setNicknameStatus("checking");

      const { data, error } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("nickname", currentNickname)
        .maybeSingle();

      if (error) {
        console.error(error);
        setNicknameStatus("error");
        return;
      }

      if (data) {
        setNicknameStatus("taken");
        setNicknameChecked("");
        return;
      }

      setNicknameStatus("available");
      setNicknameChecked(currentNickname);
    } catch (error) {
      console.error(error);
      setNicknameStatus("error");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");

    if (!normalizedNickname) {
      setMessage("닉네임을 입력해 주세요.");
      return;
    }

    if (!isValidNickname(normalizedNickname)) {
      setMessage("닉네임은 2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.");
      return;
    }

    if (hasBlockedNicknameTerm(normalizedNickname)) {
      setMessage("선정적이거나 부적절한 표현은 닉네임으로 사용할 수 없어요.");
      return;
    }

    if (!isNicknameVerified) {
      setMessage("닉네임 중복확인을 먼저 해 주세요.");
      return;
    }

    if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (removeWhitespace(password) !== password || removeWhitespace(passwordConfirm) !== passwordConfirm) {
      setMessage("비밀번호에는 공백을 사용할 수 없어요.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호가 서로 다르게 입력되었어요.");
      return;
    }

    if (password.length < 6) {
      setMessage("비밀번호는 6자 이상으로 입력해 주세요.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/signup/verified`,
          data: {
            nickname: normalizedNickname,
          },
        },
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      router.push(
        `/signup/success?email=${encodeURIComponent(email.trim())}&nickname=${encodeURIComponent(normalizedNickname)}`
      );
    } catch (error) {
      console.error(error);
      setMessage("회원가입 중 오류가 발생했어요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.formCard}>
          <div className={styles.formHeader}>
            <h1 className={styles.title}>회원가입</h1>
            <p className={styles.subtitle}>
              이메일, 닉네임, 비밀번호로 계정을 만들고
              <br />
              도안과 작업 기록을 시작해 보세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.fieldBlock}>
              <label htmlFor="nickname" className={styles.label}>
                닉네임
              </label>
              <div className={styles.inlineField}>
                <input
                  id="nickname"
                  type="text"
                  placeholder="닉네임을 입력해 주세요"
                  value={nickname}
                  onChange={(event) => {
                    setNickname(event.target.value);
                    setNicknameStatus("");
                    setNicknameChecked("");
                  }}
                  disabled={loading}
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={handleCheckNickname}
                  disabled={loading || nicknameStatus === "checking"}
                  className={styles.secondaryAction}
                >
                  {nicknameStatus === "checking" ? "확인 중..." : "중복확인"}
                </button>
              </div>
              <p className={styles.helpText}>
                2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있고 부적절한 표현은 제한돼요.
              </p>
              {nicknameMessage ? (
                <p
                  className={
                    nicknameStatus === "available" ? styles.statusSuccess : styles.statusError
                  }
                >
                  {nicknameMessage}
                </p>
              ) : null}
            </div>

            <div className={styles.fieldBlock}>
              <label htmlFor="email" className={styles.label}>
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="knitter@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                className={styles.input}
              />
            </div>

            <div className={styles.fieldBlock}>
              <label htmlFor="password" className={styles.label}>
                비밀번호
              </label>
              <div className={styles.inlineField}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력해 주세요"
                  value={password}
                  onChange={(event) => setPassword(removeWhitespace(event.target.value))}
                  disabled={loading}
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className={styles.secondaryAction}
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <div className={styles.fieldBlock}>
              <label htmlFor="passwordConfirm" className={styles.label}>
                비밀번호 확인
              </label>
              <div className={styles.inlineField}>
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호를 한 번 더 입력해 주세요"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(removeWhitespace(event.target.value))}
                  disabled={loading}
                  className={styles.input}
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  disabled={loading}
                  className={styles.secondaryAction}
                >
                  {showPasswordConfirm ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {message ? <p className={styles.message}>{message}</p> : null}

            <div className={styles.buttonGroup}>
              <button type="submit" disabled={loading} className={styles.primaryButton}>
                {loading ? "가입 중..." : "회원가입"}
              </button>
            </div>

            <div className={styles.inlineLinks}>
              <Link href="/terms" className={styles.inlineLink}>
                이용약관
              </Link>
              <Link href="/login" className={styles.inlineLinkEmphasis}>
                로그인하러 가기
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
