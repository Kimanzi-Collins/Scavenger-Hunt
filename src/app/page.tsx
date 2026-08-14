"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { HeartPulse } from "lucide-react";

export default function Home() {
  const [loadingStep, setLoadingStep] = useState(0);
  const router = useRouter();

  useEffect(() => {
    // Sequence the loading animations
    const timer1 = setTimeout(() => setLoadingStep(1), 2500); // After ID7 logo
    const timer2 = setTimeout(() => setLoadingStep(2), 5500); // Show main menu

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  return (
    <main className={styles.main}>
      <AnimatePresence mode="wait">
        {loadingStep === 0 && (
          <motion.div
            key="step0"
            className={styles.introContainer}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className={styles.id7Title}>
              Made by <span className={styles.highlight}>ID7</span>
            </h1>
            <p className={styles.subtitle}>Creative Edge</p>
          </motion.div>
        )}

        {loadingStep === 1 && (
          <motion.div
            key="step1"
            className={styles.introContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeartPulse size={64} className={styles.iconPulse} color="var(--color-red)" />
            <h2 className={styles.welcomeText}>Welcome to the Hunt</h2>
            <p className={styles.wellnessText}>
              In recognition of wellness<br />
              (mental, physical, spiritual)
            </p>
          </motion.div>
        )}

        {loadingStep === 2 && (
          <motion.div
            key="step2"
            className={styles.menuContainer}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className={styles.logoBadge}>
              <HeartPulse size={32} color="white" />
            </div>
            <h1 className={styles.mainTitle}>Wellness Hunt</h1>
            
            <div className={styles.actionButtons}>
              <button 
                className="btn-bouncy btn-blue"
                onClick={() => router.push('/join')}
                style={{ width: '100%', marginBottom: '1rem' }}
              >
                Join a Game
              </button>
              
              <button 
                className="btn-bouncy btn-yellow"
                onClick={() => router.push('/admin')}
                style={{ width: '100%' }}
              >
                Admin Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
