import Link from "next/link";

type SignupSuccessPageProps = {
  searchParams: Promise<{
    email?: string;
  }>;
};

export default async function SignupSuccessPage({
  searchParams,
}: SignupSuccessPageProps) {
  const { email } = await searchParams;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f7f2ea_45%,#eef3ec_100%)] px-6 py-10 text-[#4b3f36]">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="w-full max-w-[560px] rounded-[2rem] border border-[#ddd3c6] bg-[#fffdfa]/95 p-8 text-center shadow-[0_18px_50px_rgba(87,72,57,0.08)] backdrop-blur-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eef3ec] text-3xl">
            ✉️
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.04em] text-[#4b3f36]">
            이메일을 확인해줘
          </h1>

          <p className="mt-4 text-sm leading-7 text-[#7d6d60]">
            회원가입이 거의 끝났어.
            <br />
            {email ? (
              <>
                <span className="font-bold text-[#5a4c42]">{email}</span>
                로 보낸 인증 메일을 확인한 뒤
                <br />
                메일 안의 링크를 눌러서 인증을 완료해줘.
              </>
            ) : (
              <>
                입력한 이메일 주소로 보낸 인증 메일을 확인한 뒤
                <br />
                메일 안의 링크를 눌러서 인증을 완료해줘.
              </>
            )}
          </p>

          <div className="mt-8 space-y-3">
            <Link
              href="/"
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#8ea18c] text-base font-bold text-white shadow-[0_10px_24px_rgba(142,161,140,0.28)] transition hover:bg-[#7f937d]"
            >
              홈으로 돌아가기
            </Link>

            <Link
              href="/login"
              className="flex h-14 w-full items-center justify-center rounded-full border border-[#d9d0c4] bg-white/70 text-base font-bold text-[#7d6d60] transition hover:bg-[#faf6f0]"
            >
              로그인 페이지로 가기
            </Link>
          </div>

          <p className="mt-6 text-xs leading-6 text-[#9a8d81]">
            메일이 안 보이면 스팸함이나 프로모션함도 같이 확인해줘.
          </p>
        </section>
      </div>
    </main>
  );
}