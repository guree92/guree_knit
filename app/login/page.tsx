"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setMessage("");

    if (!email.trim() || !password.trim()) {
      setMessage("이메일과 비밀번호를 모두 입력해줘.");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage("로그인에 실패했어. 이메일이나 비밀번호를 다시 확인해줘.");
        return;
      }

      setMessage("로그인 성공!");
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("로그인 중 오류가 발생했어.");
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
              로그인
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#8a7a6b]">
              이메일과 비밀번호를 입력해서
              <br />
              Knit.GUREE에 들어와줘
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              {loading ? "로그인 중..." : "로그인하기"}
            </button>

            <Link
              href="/terms"
              className="flex h-14 w-full items-center justify-center rounded-full border border-[#d9d0c4] bg-white/70 text-base font-bold text-[#7d6d60] transition hover:bg-[#faf6f0]"
            >
              계정이 없어? 회원가입
            </Link>
          </form>
        </div>
      </div>
    </main>
  );
}