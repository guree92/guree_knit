import Header from "@/components/layout/Header";
import HeroSection from "@/components/home/HeroSection";
import FeatureSection from "@/components/home/FeatureSection";
import DotMakerSection from "@/components/home/DotMakerSection";
import CategorySection from "@/components/home/CategorySection";
import CommunitySection from "@/components/home/CommunitySection";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffdf8_0%,#f8f4ff_48%,#eef8f2_100%)] text-slate-800">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8 md:px-8 md:py-10">
        <Header />

        <div className="mt-12 flex flex-col gap-20 md:gap-24">
          <HeroSection />
          <FeatureSection />
          <DotMakerSection />
          <CategorySection />
          <CommunitySection />
        </div>
      </section>
    </main>
  );
}