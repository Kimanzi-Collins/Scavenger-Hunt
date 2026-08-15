"use client";

import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import SplashScreen from "@/components/SplashScreen";

export default function Home() {
  const router = useRouter();

  const neoSpring = { type: "spring" as const, stiffness: 400, damping: 17 };

  return (
    <main className={styles.main}>
      <SplashScreen key="splash" onComplete={() => router.push('/join?skipSplash=true')} />
    </main>
  );
}
