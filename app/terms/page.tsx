"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const termsList = [
  {
    id: "age",
    title: "留?14???댁긽?낅땲??",
    content:
      "蹂??쒕퉬?ㅻ뒗 留?14???댁긽 ?댁슜?먮? ??곸쑝濡??⑸땲?? ?뚯썝媛?낆쓣 吏꾪뻾?섏떆??寃쎌슦, ?뚯썝?섏? 留?14???댁긽?꾩쓣 ?뺤씤?섍퀬 ?댁뿉 ?숈쓽??寃껋쑝濡?媛꾩＜?⑸땲??",
    required: true,
  },
  {
    id: "service",
    title: "?쒕퉬???댁슜?쎄????숈쓽?⑸땲??",
    content:
      "?뚯썝?섏? Knit.GUREE?먯꽌 ?쒓났?섎뒗 ?꾩븞 怨듭쑀, ?묓뭹 湲곕줉, 而ㅻ??덊떚, ?먮ℓ 愿??湲곕뒫??愿??踰뺣졊怨??댁쁺?뺤콉???곕씪 ?댁슜?섏뿬???⑸땲?? ?쒕퉬?ㅼ쓽 ?뺤긽?곸씤 ?댁쁺??諛⑺빐?섍굅???ㅻⅨ ?댁슜?먯뿉寃??쇳빐瑜?二쇰뒗 ?됱쐞???쒗븳?????덉뒿?덈떎.",
    required: true,
  },
  {
    id: "privacy",
    title: "媛쒖씤?뺣낫 ?섏쭛 諛??댁슜???숈쓽?⑸땲??",
    content:
      "?쒕퉬???댁쁺?먮뒗 ?뚯썝媛?? 濡쒓렇?? ?쒕퉬???쒓났 諛?怨좉컼 ?묐?瑜??꾪빐 ?대찓?????꾩슂??理쒖냼?쒖쓽 媛쒖씤?뺣낫瑜??섏쭛쨌?댁슜?????덉뒿?덈떎. ?섏쭛??媛쒖씤?뺣낫??愿??踰뺣졊 諛?媛쒖씤?뺣낫泥섎━諛⑹묠???곕씪 ?덉쟾?섍쾶 愿由щ맗?덈떎.",
    required: true,
  },
  {
    id: "copyright",
    title: "寃뚯떆臾셋룹??묎텒쨌?먮ℓ 梨낆엫???숈쓽?⑸땲??",
    content:
      "?뚯썝?섏? 蹂몄씤???낅줈?쒗븯嫄곕굹 ?깅줉?섎뒗 ?꾩븞, ?대?吏, ?ㅻ챸, 寃뚯떆湲 諛??먮ℓ 肄섑뀗痢??깆뿉 ?????묎텒 諛?愿??沅뚮━瑜?蹂댁쑀?섍퀬 ?덇굅??寃뚯떆???뺣떦??沅뚰븳???덉쓬??蹂댁쬆?댁빞 ?⑸땲?? ??몄쓽 ??묎텒 ?먮뒗 沅뚮━瑜?移⑦빐?섎뒗 肄섑뀗痢좊? ?낅줈?쒗븯嫄곕굹 ?먮ℓ?섎뒗 寃쎌슦 紐⑤뱺 踰뺤쟻 梨낆엫? ?대떦 ?뚯썝?먭쾶 ?덉쑝硫??쒕퉬???댁쁺?먮뒗 ?댁뿉 ???梨낆엫??吏吏 ?딆뒿?덈떎. ?먰븳 沅뚮━ 移⑦빐 ?좉퀬媛 ?묒닔?섍굅???댁쁺?뺤콉 ?꾨컲???뺤씤??寃쎌슦 ?쒕퉬???댁쁺?먮뒗 ?ъ쟾 ?듭? ?놁씠 肄섑뀗痢???젣 ?먮뒗 ?묎렐 ?쒗븳 議곗튂瑜??????덉뒿?덈떎. ?뚯썝???낅줈?쒗븳 肄섑뀗痢좊뒗 ?쒕퉬????寃뚯떆, ?쒖떆, 寃?? 異붿쿇 ?깆쓽 紐⑹쟻?쇰줈 ?ъ슜?????덉쑝硫??대? ?꾪빐 ?쒕퉬???댁쁺?먯뿉寃?鍮꾨룆?먯쟻 ?ъ슜沅뚯씠 遺?щ맗?덈떎. ?뚯썝???먮ℓ?섎뒗 ?꾩븞 諛??곹뭹???댁슜, ?덉쭏, ??묎텒, 嫄곕옒 遺꾩웳 ?깆쓽 梨낆엫? ?먮ℓ ?뚯썝?먭쾶 ?덉뒿?덈떎.",
    required: true,
  },
  {
    id: "policy",
    title: "?댁쁺?뺤콉 諛??댁슜?쒗븳 議곗튂???숈쓽?⑸땲??",
    content:
      "?뚯썝?섏씠 ??묎텒 移⑦빐, 遺덈쾿 肄섑뀗痢?寃뚯떆, ???沅뚮━ 移⑦빐, ?ш린??嫄곕옒, ?댁쁺?뺤콉 ?꾨컲 ?깆쓽 ?됱쐞瑜???寃쎌슦 ?쒕퉬???댁쁺?먮뒗 ?ъ쟾 ?듭? ?놁씠 寃뚯떆臾???젣, 怨꾩젙 ?뺤? ?먮뒗 ?쒕퉬???댁슜 ?쒗븳 ?깆쓽 議곗튂瑜?痍⑦븷 ???덉뒿?덈떎.",
    required: true,
  },
  {
    id: "marketing",
    title: "留덉????뺣낫 ?섏떊???숈쓽?⑸땲??",
    content:
      "?대깽?? ?좉퇋 湲곕뒫 ?덈궡, ?쒗깮 ?뺣낫 ?깆쓽 ?덈궡 硫붿씪???섏떊?섎뒗 寃껋뿉 ?숈쓽?⑸땲?? 蹂???ぉ? ?좏깮 ?ы빆?대ŉ ?숈쓽?섏? ?딆븘???쒕퉬???댁슜??媛?ν빀?덈떎.",
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
            <h1 className="mt-8 text-3xl font-extrabold">
              ?쎄? ?숈쓽
            </h1>

            <p className="mt-3 text-sm text-[#8a7a6b]">
              ?뚯썝媛???꾩뿉 ?꾨옒 ?쎄????뺤씤?섏떆怨?
              <br />
              ?꾩닔 ??ぉ???숈쓽??二쇱꽭??
            </p>
          </div>

          {/* ?꾩껜 ?숈쓽 */}

          <div className="mb-6 rounded-xl border border-[#d9d0c4] bg-[#f8f4ee] p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="font-bold">?꾩껜 ?쎄????숈쓽?⑸땲??/p>
                <p className="text-sm text-[#8a7a6b]">
                  ?좏깮 ??ぉ???ы븿??紐⑤뱺 ?쎄????숈쓽?⑸땲??
                </p>
              </div>

              <input
                type="checkbox"
                checked={isAllChecked}
                onChange={toggleAll}
                className="w-5 h-5 accent-[#8ea18c]"
              />
            </label>
          </div>

          {/* ?쎄? 由ъ뒪??*/}

          <div className="space-y-4">

            {termsList.map((term) => (
              <div
                key={term.id}
                className="rounded-xl border border-[#e2d9cc] bg-white p-5"
              >
                <label className="flex justify-between gap-4 cursor-pointer">
                  <div>

                    <div className="flex gap-2 items-center">
                      <span className="font-bold">
                        {term.title}
                      </span>

                      {term.required ? (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#eef3ec] text-[#7a8e78] font-bold">
                          ?꾩닔
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full bg-[#f1efe9] text-[#8a7a6b] font-bold">
                          ?좏깮
                        </span>
                      )}

                    </div>

                    <p className="mt-3 text-sm text-[#7c6d61] leading-6">
                      {term.content}
                    </p>

                  </div>

                  <input
                    type="checkbox"
                    checked={checkedItems[term.id]}
                    onChange={() => toggleItem(term.id)}
                    className="mt-1 w-5 h-5 accent-[#8ea18c]"
                  />

                </label>
              </div>
            ))}

          </div>

          {/* 踰꾪듉 */}

          <div className="mt-8 flex gap-3">

            <button
              onClick={handleAgree}
              disabled={!isRequiredChecked}
              className="flex-1 h-14 rounded-full bg-[#8ea18c] text-white font-bold shadow hover:bg-[#7f937d] disabled:bg-[#c7d1c5]"
            >
              ?숈쓽
            </button>

            <button
              onClick={handleCancel}
              className="flex-1 h-14 rounded-full border border-[#d9d0c4] font-bold text-[#7d6d60] hover:bg-[#faf6f0]"
            >
              痍⑥냼
            </button>

          </div>

        </section>
      </div>
    </main>
  );
}
