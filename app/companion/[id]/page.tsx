import Image from "next/image";
import Header from "@/components/layout/Header";
import CompanionDetailClient from "@/components/companion/CompanionDetailClient";
import styles from "./page.module.css";
import heroHeaderImage from "../../../Image/headerlogo.png";

export default function CompanionDetailPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <section className={styles.heroPanel}>
          <div className={styles.heroCopy}>
            <div className={styles.heroTitleImage}>
              <Image
                src={heroHeaderImage}
                alt="Hero header"
                priority
                unoptimized
                className={styles.heroTitleImageAsset}
              />
            </div>
          </div>
        </section>
        <CompanionDetailClient />
      </main>
    </>
  );
}
