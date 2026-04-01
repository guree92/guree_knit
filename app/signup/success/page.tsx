import Link from "next/link";

type SignupSuccessPageProps = {
  searchParams: Promise<{
    email?: string;
    nickname?: string;
  }>;
};

export default async function SignupSuccessPage({
  searchParams,
}: SignupSuccessPageProps) {
  const { email, nickname } = await searchParams;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f6eee2_0%,#f8f4ed_36%,#ecf2e8_100%)] px-5 py-10 text-[#4b3f36] sm:px-6">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#e7d8c4]/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-[#d3e2d0]/35 blur-3xl" />
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <section className="relative w-full max-w-[620px] overflow-hidden rounded-[2rem] border border-[#ddd3c6] bg-[#fffdfa]/95 p-7 shadow-[0_20px_55px_rgba(87,72,57,0.12)] backdrop-blur-sm sm:p-10">
          <div className="absolute -right-16 top-0 h-36 w-36 rounded-full bg-[#eef3ec] opacity-75" />
          <div className="absolute -left-10 bottom-8 h-24 w-24 rounded-full bg-[#f3e6d6] opacity-80" />

          <div className="relative text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.2rem] border border-[#d3c8b8] bg-[#f7f1e8] text-3xl shadow-[0_8px_20px_rgba(120,101,82,0.08)]">
              🧶
            </div>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.24em] text-[#8e7f71]">
              Email Verification
            </p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-[-0.04em] text-[#4b3f36] sm:text-[2.1rem]">
              {nickname ? `${nickname}님, 마지막 단계예요` : "회원가입 마지막 단계예요"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-[#736457] sm:text-[15px]">
              아래 메일함에서 인증 링크를 눌러주면 계정이 바로 활성화돼요.
            </p>
          </div>

          <div className="relative mt-6 rounded-[1.3rem] border border-[#e1d7ca] bg-[#fcf8f2] p-4 text-center sm:p-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#9a8d81]">인증 메일 전송 주소</p>
            <p className="mt-2 break-all text-base font-bold text-[#5a4c42] sm:text-lg">
              {email ?? "입력한 이메일 주소"}
            </p>
          </div>

          <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-[#e4dbcf] bg-white/70 p-4">
              <p className="text-xs font-bold tracking-[0.16em] text-[#9c8f82]">STEP 1</p>
              <p className="mt-2 text-sm leading-6 text-[#64564a]">받은 메일함을 새로고침해 주세요.</p>
            </div>
            <div className="rounded-[1.2rem] border border-[#e4dbcf] bg-white/70 p-4">
              <p className="text-xs font-bold tracking-[0.16em] text-[#9c8f82]">STEP 2</p>
              <p className="mt-2 text-sm leading-6 text-[#64564a]">인증 메일 안의 버튼 또는 링크를 눌러요.</p>
            </div>
            <div className="rounded-[1.2rem] border border-[#e4dbcf] bg-white/70 p-4">
              <p className="text-xs font-bold tracking-[0.16em] text-[#9c8f82]">STEP 3</p>
              <p className="mt-2 text-sm leading-6 text-[#64564a]">인증 완료 후 로그인해서 바로 시작해요.</p>
            </div>
          </div>

          <div className="relative mt-8 space-y-3">
            <Link
              href="/login"
              className="flex h-14 w-full items-center justify-center rounded-full bg-[#8ea18c] text-base font-bold text-white shadow-[0_12px_28px_rgba(142,161,140,0.28)] transition hover:translate-y-[-1px] hover:bg-[#7f937d]"
            >
              인증 후 로그인하러 가기
            </Link>

            <Link
              href="/"
              className="flex h-14 w-full items-center justify-center rounded-full border border-[#d9d0c4] bg-white/70 text-base font-bold text-[#7d6d60] transition hover:bg-[#faf6f0]"
            >
              홈으로 돌아가기
            </Link>
          </div>

          <p className="relative mt-6 rounded-xl bg-[#f4eee6] px-4 py-3 text-center text-xs leading-6 text-[#8b7e71]">
            메일이 안 보이면 스팸함, 프로모션함을 확인하고 1~2분 뒤 다시 확인해 주세요.
          </p>
        </section>
      </div>
    </main>
  );
}
