"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (password !== passwordConfirm) {
      alert("비밀번호가 서로 다르게 입력됐어.");
      return;
    }

    // 나중에 supabase 회원가입 연결
    console.log("signup", { email, password, passwordConfirm });
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
              이메일과 비밀번호로 계정을 만들고
              <br />
              도안과 작품을 함께 기록해보자
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
                placeholder="guree92@icloud.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-[1.2rem] border border-[#d8cfc2] bg-[#f8f4ee] px-5 text-base text-[#4b3f36] outline-none transition placeholder:text-[#b7aa9b] focus:border-[#9aae97] focus:bg-[#fcfaf6] focus:ring-4 focus:ring-[#dfe8dc]"
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
                  className="h-full flex-1 rounded-[1.2rem] bg-transparent px-5 text-base text-[#4b3f36] outline-none placeholder:text-[#b7aa9b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="flex h-10 min-w-[76px] items-center justify-center rounded-full border border-[#cfc4b5] bg-[#f3eee6] px-4 text-sm font-bold tracking-[0.14em] text-[#7a8e78] transition hover:bg-[#ebe5db]"
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
                  className="h-full flex-1 rounded-[1.2rem] bg-transparent px-5 text-base text-[#4b3f36] outline-none placeholder:text-[#b7aa9b]"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((prev) => !prev)}
                  className="flex h-10 min-w-[76px] items-center justify-center rounded-full border border-[#cfc4b5] bg-[#f3eee6] px-4 text-sm font-bold tracking-[0.14em] text-[#7a8e78] transition hover:bg-[#ebe5db]"
                >
                  {showPasswordConfirm ? "HIDE" : "SHOW"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 h-15 w-full rounded-full bg-[#8ea18c] text-base font-bold text-white shadow-[0_10px_24px_rgba(142,161,140,0.28)] transition hover:bg-[#7f937d]"
            >
              회원가입
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