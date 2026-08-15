"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeartPulse } from "lucide-react";
import styles from "./splash.module.css";

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [loadingStep, setLoadingStep] = useState(0);

  useEffect(() => {
    // Sequence the loading animations
    const timer1 = setTimeout(() => setLoadingStep(1), 2500); // After ID7 logo
    const timer2 = setTimeout(() => {
      setLoadingStep(2);
      setTimeout(onComplete, 500); // wait for fade out
    }, 5500); // Show main menu

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onComplete]);

  return (
    <div className={styles.splashContainer}>
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
      </AnimatePresence>
    </div>
  );
}
