"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./terms.module.css";

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

  useEffect(() => {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    const previousPadding = document.body.style.padding;
    const previousBackground = document.body.style.background;
    const previousBackgroundColor = document.body.style.backgroundColor;
    const previousHtmlBackgroundColor = document.documentElement.style.backgroundColor;

    const syncPadding = () => {
      if (window.innerWidth <= 900) {
        document.body.style.padding = "16px";
        return;
      }

      if (window.innerWidth <= 1180) {
        document.body.style.padding = "20px";
        return;
      }

      document.body.style.padding = "24px";
    };

    document.body.classList.add("terms-page-mode");
    document.documentElement.classList.add("terms-page-mode");
    syncPadding();
    document.body.style.background = "#f3f4f6";
    document.body.style.backgroundColor = "#f3f4f6";
    document.documentElement.style.backgroundColor = "#f3f4f6";
    window.addEventListener("resize", syncPadding);

    return () => {
      window.removeEventListener("resize", syncPadding);
      document.body.classList.remove("terms-page-mode");
      document.documentElement.classList.remove("terms-page-mode");
      document.body.style.padding = previousPadding;
      document.body.style.background = previousBackground;
      document.body.style.backgroundColor = previousBackgroundColor;
      document.documentElement.style.backgroundColor = previousHtmlBackgroundColor;
    };
  }, []);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({
    age: false,
    service: false,
    privacy: false,
    copyright: false,
    policy: false,
    marketing: false,
  });

  const requiredTerms = useMemo(() => termsList.filter((t) => t.required), []);

  const isRequiredChecked = useMemo(
    () => requiredTerms.every((t) => checkedItems[t.id]),
    [checkedItems, requiredTerms]
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
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.card}>
          <div className={styles.header}>
            <h1 className={styles.title}>약관 동의</h1>
            <p className={styles.subtitle}>
              회원가입 전에 아래 약관을 확인하시고
              <br />
              필수 항목에 동의해 주세요.
            </p>
          </div>

          <div className={styles.allAgreeBox}>
            <label className={styles.checkboxRow}>
              <div>
                <p className={styles.allAgreeTitle}>전체 약관에 동의합니다.</p>
                <p className={styles.allAgreeDescription}>선택 항목을 포함한 모든 약관에 동의합니다.</p>
              </div>
              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={toggleAll}
                className={styles.checkbox}
              />
            </label>
          </div>

          <div className={styles.termsList}>
            {termsList.map((term) => (
              <div key={term.id} className={styles.termItem}>
                <label className={styles.checkboxRow}>
                  <div>
                    <div className={styles.termHeader}>
                      <span className={styles.termTitle}>{term.title}</span>
                      <span className={term.required ? styles.requiredBadge : styles.optionalBadge}>
                        {term.required ? "필수" : "선택"}
                      </span>
                    </div>
                    <p className={styles.termContent}>{term.content}</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checkedItems[term.id]}
                    onChange={() => toggleItem(term.id)}
                    className={styles.checkbox}
                  />
                </label>
              </div>
            ))}
          </div>

          <div className={styles.buttonRow}>
            <button onClick={handleAgree} disabled={!isRequiredChecked} className={styles.primaryButton}>
              동의
            </button>
            <button onClick={handleCancel} className={styles.secondaryButton}>
              취소
            </button>
          </div>

          <div className={styles.footerText}>
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className={styles.loginLink}>
              로그인
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
