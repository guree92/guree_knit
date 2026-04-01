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
  return /^[가-힣a-zA-Z0-9_]{2,12}$/.test(nickname);
}

export default function SignupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
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

  const normalizedNickname = useMemo(() => normalizeNickname(nickname), [nickname]);
  const isNicknameVerified =
    nicknameStatus === "available" && nicknameChecked === normalizedNickname;

  async function handleCheckNickname() {
    setMessage("");

    const currentNickname = normalizeNickname(nickname);

    if (!currentNickname || !isValidNickname(currentNickname)) {
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

    if (!isNicknameVerified) {
      setMessage("닉네임 중복확인을 먼저 해 주세요.");
      return;
    }

    if (!email.trim() || !password.trim() || !passwordConfirm.trim()) {
      setMessage("이메일과 비밀번호를 모두 입력해 주세요.");
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
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=/login`,
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
              도안과 작업 기록을 시작해 보세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="nickname" className="mb-2 block text-sm font-bold text-[#5a4c42]">
                닉네임
              </label>

              <div className="flex gap-2">
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
                  className="h-14 flex-1 rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc] disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={handleCheckNickname}
                  disabled={loading || nicknameStatus === "checking"}
                  className="h-14 min-w-[110px] rounded-[1.2rem] border border-[#d9d0c4] bg-white/80 px-4 text-sm font-bold text-[#6f6257] transition hover:bg-[#faf6f0] disabled:opacity-60"
                >
                  {nicknameStatus === "checking" ? "확인 중..." : "중복확인"}
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#9a8d81]">
                2~12자의 한글, 영문, 숫자, 밑줄(_)만 사용할 수 있어요.
              </p>

              {nicknameStatus === "available" ? (
                <p className="mt-2 text-sm font-bold text-[#7a8e78]">사용 가능한 닉네임이에요.</p>
              ) : null}
              {nicknameStatus === "taken" ? (
                <p className="mt-2 text-sm font-bold text-[#c26b61]">이미 사용 중인 닉네임이에요.</p>
              ) : null}
              {nicknameStatus === "invalid" ? (
                <p className="mt-2 text-sm font-bold text-[#c26b61]">닉네임 형식을 다시 확인해 주세요.</p>
              ) : null}
              {nicknameStatus === "error" ? (
                <p className="mt-2 text-sm font-bold text-[#c26b61]">중복확인 중 오류가 발생했어요.</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold text-[#5a4c42]">
                이메일
              </label>
              <input
                id="email"
                type="email"
                placeholder="knitter@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                className="h-14 w-full rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc] disabled:opacity-60"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-bold text-[#5a4c42]">
                비밀번호
              </label>
              <div className="flex gap-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="비밀번호를 입력해 주세요"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={loading}
                  className="h-14 flex-1 rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="h-14 min-w-[92px] rounded-[1.2rem] border border-[#d9d0c4] bg-white/80 px-4 text-sm font-bold text-[#6f6257] transition hover:bg-[#faf6f0]"
                >
                  {showPassword ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="passwordConfirm" className="mb-2 block text-sm font-bold text-[#5a4c42]">
                비밀번호 확인
              </label>
              <div className="flex gap-2">
                <input
                  id="passwordConfirm"
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="비밀번호를 한 번 더 입력해 주세요"
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  disabled={loading}
                  className="h-14 flex-1 rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc] disabled:opacity-60"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  className="h-14 min-w-[92px] rounded-[1.2rem] border border-[#d9d0c4] bg-white/80 px-4 text-sm font-bold text-[#6f6257] transition hover:bg-[#faf6f0]"
                >
                  {showPasswordConfirm ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            {message ? (
              <p className="rounded-[1.2rem] bg-[#f7ebe8] px-4 py-3 text-sm font-medium text-[#b15b54]">
                {message}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-[1.35rem] bg-[#8ca08b] text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#7d927d] disabled:opacity-60"
            >
              {loading ? "가입 중..." : "회원가입"}
            </button>

            <p className="text-center text-sm text-[#8a7a6b]">
              이미 계정이 있나요?{" "}
              <Link href="/login" className="font-bold text-[#6d8270] underline underline-offset-4">
                로그인하러 가기
              </Link>
            </p>
          </form>
        </div>
      </div>
    </main>
  );
}
