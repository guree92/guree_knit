"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const termsList = [
  {
    id: "age",
    title: "만 14세 이상입니다.",
    content:
      "본 서비스는 만 14세 이상 이용자를 대상으로 합니다. 회원가입을 진행하는 경우, 회원님이 만 14세 이상임을 확인하고 이에 동의한 것으로 간주합니다.",
    required: true,
  },
  {
    id: "service",
    title: "서비스 이용약관에 동의합니다.",
    content:
      "회원님은 Knit.GUREE에서 제공하는 도안 공유, 작품 기록, 커뮤니티, 판매 관련 기능을 관련 법령과 운영정책에 따라 이용하여야 합니다. 서비스의 정상적인 운영을 방해하거나 다른 이용자에게 피해를 주는 행위는 제한될 수 있습니다.",
    required: true,
  },
  {
    id: "privacy",
    title: "개인정보 수집 및 이용에 동의합니다.",
    content:
      "서비스 운영자는 회원가입, 로그인, 서비스 제공 및 고객 응대를 위해 이메일 등 필요한 최소한의 개인정보를 수집 및 이용할 수 있습니다. 수집된 개인정보는 관련 법령과 개인정보처리방침에 따라 안전하게 관리됩니다.",
    required: true,
  },
  {
    id: "copyright",
    title: "게시물 등록 및 권리 책임에 동의합니다.",
    content:
      "회원님이 업로드하거나 등록하는 도안, 이미지, 설명, 게시글 및 판매 콘텐츠에 대한 저작권과 관련 권리를 보유하고 있거나 게시할 정당한 권한이 있음을 보증해야 합니다. 타인의 저작권이나 권리를 침해하는 콘텐츠를 업로드하거나 판매하는 경우 모든 법적 책임은 해당 회원에게 있습니다.",
    required: true,
  },
  {
    id: "policy",
    title: "운영정책 및 이용제한 조치에 동의합니다.",
    content:
      "회원님이 저작권 침해, 불법 콘텐츠 게시, 타인 권리 침해, 사기성 거래, 운영정책 위반 등의 행위를 할 경우 서비스 운영자는 사전 통지 없이 게시물 제거, 계정 정지 또는 서비스 이용 제한 조치를 취할 수 있습니다.",
    required: true,
  },
  {
    id: "marketing",
    title: "마케팅 정보 수신에 동의합니다.",
    content:
      "이벤트, 신규 기능 안내, 혜택 정보 등의 안내 메일을 수신하는 것에 동의합니다. 본 항목은 선택 사항이며 동의하지 않아도 서비스 이용은 가능합니다.",
    required: false,
  },
] as const;

export default function TermsPage() {
  const router = useRouter();

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    age: false,
    service: false,
    privacy: false,
    copyright: false,
    policy: false,
    marketing: false,
  });

  const requiredTerms = termsList.filter((t) => t.required);

  const isRequiredChecked = useMemo(
    () => requiredTerms.every((t) => checkedItems[t.id]),
    [checkedItems]
  );

  const isAllChecked = useMemo(
    () => termsList.every((t) => checkedItems[t.id]),
    [checkedItems]
  );

  function toggleItem(id: string) {
    setCheckedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  }

  function toggleAll() {
    const next = !isAllChecked;

    const updated = termsList.reduce<Record<string, boolean>>((acc, term) => {
      acc[term.id] = next;
      return acc;
    }, {});

    setCheckedItems(updated);
  }

  function handleAgree() {
    if (!isRequiredChecked) return;

    router.push("/signup");
  }

  function handleCancel() {
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2ea_45%,#eef3ec_100%)] px-6 py-10 text-[#4b3f36]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="w-full max-w-[760px] rounded-[2rem] border border-[#ddd3c6] bg-[#fffdfa]/95 p-8 shadow-[0_18px_50px_rgba(87,72,57,0.08)] backdrop-blur-sm">
          <div className="mb-8 text-center">
            <h1 className="mt-8 text-3xl font-extrabold">약관 동의</h1>

            <p className="mt-3 text-sm text-[#8a7a6b]">
              회원가입 전에 아래 약관을 확인하시고
              <br />
              필수 항목에 동의해 주세요.
            </p>
          </div>

          <div className="mb-6 rounded-xl border border-[#d9d0c4] bg-[#f8f4ee] p-4">
            <label className="flex cursor-pointer items-center justify-between">
              <div>
                <p className="font-bold">전체 약관에 동의합니다.</p>
                <p className="text-sm text-[#8a7a6b]">
                  선택 항목을 포함한 모든 약관에 동의합니다.
                </p>
              </div>

              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={toggleAll}
                className="h-5 w-5 accent-[#8ea18c]"
              />
            </label>
          </div>

          <div className="space-y-4">
            {termsList.map((term) => (
              <div key={term.id} className="rounded-xl border border-[#e2d9cc] bg-white p-5">
                <label className="flex cursor-pointer justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{term.title}</span>

                      {term.required ? (
                        <span className="rounded-full bg-[#eef3ec] px-2 py-1 text-xs font-bold text-[#7a8e78]">
                          필수
                        </span>
                      ) : (
                        <span className="rounded-full bg-[#f1efe9] px-2 py-1 text-xs font-bold text-[#8a7a6b]">
                          선택
                        </span>
                      )}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-[#7c6d61]">{term.content}</p>
                  </div>

                  <input
                    type="checkbox"
                    checked={checkedItems[term.id]}
                    onChange={() => toggleItem(term.id)}
                    className="mt-1 h-5 w-5 accent-[#8ea18c]"
                  />
                </label>
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleAgree}
              disabled={!isRequiredChecked}
              className="h-14 flex-1 rounded-full bg-[#8ea18c] font-bold text-white shadow hover:bg-[#7f937d] disabled:bg-[#c7d1c5]"
            >
              동의
            </button>

            <button
              onClick={handleCancel}
              className="h-14 flex-1 rounded-full border border-[#d9d0c4] font-bold text-[#7d6d60] hover:bg-[#faf6f0]"
            >
              취소
            </button>
          </div>

          <div className="mt-6 text-center text-sm text-[#8a7a6b]">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="font-bold text-[#6f806a] underline-offset-4 hover:underline">
              로그인
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
