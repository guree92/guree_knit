"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function normalizeNickname(value: string) {
  return value.trim();
}

function isValidNickname(value: string) {
  const nickname = normalizeNickname(value);

  // 한글, 영문, 숫자, 밑줄만 허용 / 2~12자
  return /^[가-힣a-zA-Z0-9_]{2,12}$/.test(nickname);
}

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nickname, setNickname] = useState("");
  const [nicknameChecked, setNicknameChecked] = useState("");
  const [nicknameStatus, setNicknameStatus] = useState<
    "" | "checking" | "available" | "taken" | "invalid" | "error"
  >("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const normalizedNickname = useMemo(
    () => normalizeNickname(nickname),
    [nickname]
  );

  const isNicknameVerified =
    nicknameStatus === "available" && nicknameChecked === normalizedNickname;

  async function handleCheckNickname() {
    setMessage("");

    const currentNickname = normalizeNickname(nickname);

    if (!currentNickname) {
      setNicknameStatus("invalid");
      return;
    }

    if (!isValidNickname(currentNickname)) {
      setNicknameStatus("invalid");
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage("");

    if (!normalizedNickname) {
      setMessage("닉네임을 입력해줘.");
      return;
    }

    if (!isValidNickname(normalizedNickname)) {
      setMessage("닉네임은 2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어.");
      return;
    }

    if (!isNicknameVerified) {
      setMessage("닉네임 중복검사를 먼저 해줘.");
      return;
    }

    if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setMessage("이메일과 비밀번호를 모두 입력해줘.");
      return;
    }

    if (password !== passwordConfirm) {
      setMessage("비밀번호가 서로 다르게 입력됐어.");
      return;
    }

    if (password.length < 6) {
      setMessage("비밀번호는 6자 이상으로 입력해줘.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            nickname: normalizedNickname,
          },
        },
      });

      if (error) {
        // unique 제약 또는 trigger 관련 문제도 여기로 들어올 수 있음
        setMessage(error.message);
        return;
      }

      router.push(
        `/signup/success?email=${encodeURIComponent(
          email.trim()
        )}&nickname=${encodeURIComponent(normalizedNickname)}`
      );
    } catch (error) {
      console.error(error);
      setMessage("회원가입 중 오류가 발생했어.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2ea_45%,#eef3ec_100%)] px-6 py-10 text-[#4b3f36]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-[520px] rounded-[2rem] border border-[#ddd3c6] bg-[#fffdfa]/95 p-8 shadow-[0_18px_50px_rgba(87,72,57,0.08)] backdrop-blur-sm sm:p-10">
          <div className="mb-8 text-center">
            <h1 className="mt-8 text-4xl font-extrabold tracking-[-0.04em] text-[#4b3f36]">
              회원가입
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#8a7a6b]">
              이메일, 닉네임, 비밀번호로 계정을 만들고
              <br />
              도안과 작품을 함께 기록해보자
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="nickname"
                className="mb-2 block text-sm font-bold text-[#5a4c42]"
              >
                닉네임
              </label>

              <div className="flex gap-2">
                <input
                  id="nickname"
                  type="text"
                  placeholder="닉네임 입력"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    setNicknameStatus("");
                    setNicknameChecked("");
                  }}
                  disabled={loading}
                  className="h-14 flex-1 rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc] disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={handleCheckNickname}
                  disabled={loading || nicknameStatus === "checking"}
                  className="h-14 min-w-[110px] rounded-[1.2rem] border border-[#d9d0c4] bg-white/80 px-4 text-sm font-bold text-[#6f6257] transition hover:bg-[#faf6f0] disabled:opacity-60"
                >
                  {nicknameStatus === "checking" ? "확인 중..." : "중복검사"}
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#9a8d81]">
                2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어.
              </p>

              {nicknameStatus === "available" ? (
                <p className="mt-2 text-sm font-bold text-[#7a8e78]">
                  사용 가능한 닉네임이야.
                </p>
              ) : null}

              {nicknameStatus === "taken" ? (
                <p className="mt-2 text-sm font-bold text-[#c26b61]">
                  이미 사용 중인 닉네임이야.
                </p>
              ) : null}

              {nicknameStatus === "invalid" ? (
                <p className="mt-2 text-sm font-bold text-[#c26b61]">
                  닉네임 형식을 다시 확인해줘.
                </p>
              ) : null}

              {nicknameStatus === "error" ? (
                <p className="mt-2 text-sm font-bold text-[#c26b61]">
                  닉네임 확인 중 오류가 발생했어.
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-bold text-[#5a4c42]"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-14 w-full rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc] disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-bold text-[#5a4c42]"
              >
                비밀번호
              </label>

              <div className="flex h-14 items-center rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] pr-2 focus-within:border-[#9aae97] focus-within:ring-4 focus-within:ring-[#dfe8dc]">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호 입력"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  className="h-full flex-1 rounded-[1.2rem] bg-transparent px-5 text-base text-[#4b3f36] outline-none placeholder:text-[#b7aa9b] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="flex h-10 min-w-[76px] items-center justify-center rounded-full border border-[#cfc4b5] bg-[#f3eee6] px-4 text-sm font-bold tracking-[0.14em] text-[#7a8e78] transition hover:bg-[#ebe5db] disabled:opacity-60"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="mb-2 block text-sm font-bold text-[#5a4c42]"
              >
                비밀번호 확인
              </label>

              <div className="flex h-14 items-center rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] pr-2 focus-within:border-[#9aae97] focus-within:ring-4 focus-within:ring-[#dfe8dc]">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호 다시 입력"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  disabled={loading}
                  className="h-full flex-1 rounded-[1.2rem] bg-transparent px-5 text-base text-[#4b3f36] outline-none placeholder:text-[#b7aa9b] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  disabled={loading}
                  className="flex h-10 min-w-[76px] items-center justify-center rounded-full border border-[#cfc4b5] bg-[#f3eee6] px-4 text-sm font-bold tracking-[0.14em] text-[#7a8e78] transition hover:bg-[#ebe5db] disabled:opacity-60"
                >
                  {showPasswordConfirm ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {message ? (
              <p className="rounded-[1.1rem] border border-[#e3d8cc] bg-[#f8f4ee] px-4 py-3 text-sm leading-6 text-[#6f6257]">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-15 w-full rounded-full bg-[#8ea18c] text-base font-bold text-white shadow-[0_10px_24px_rgba(142,161,140,0.28)] transition hover:bg-[#7f937d] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "회원가입 중..." : "회원가입"}
            </button>

            <Link
              href="/login"
              className="flex h-14 w-full items-center justify-center rounded-full border border-[#d9d0c4] bg-white/70 text-base font-bold text-[#7d6d60] transition hover:bg-[#faf6f0]"
            >
              이미 계정이 있어? 로그인
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}