import Header from "@/components/layout/Header";
import CompanionDetailClient from "@/components/companion/CompanionDetailClient";
import styles from "./page.module.css";

export default function CompanionDetailPage() {
  return (
    <>
      <Header />
      <main className={styles.page}>
        <CompanionDetailClient />
      </main>
    </>
  );
}
