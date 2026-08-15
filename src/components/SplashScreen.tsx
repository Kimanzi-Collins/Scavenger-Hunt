"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Compass, Brain, Activity, Heart } from "lucide-react";
import styles from "./splash.module.css";

const neoSpring = { type: "spring", stiffness: 400, damping: 17 };

export default function SplashScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 600),   // Beat 2: Made by ID7
      setTimeout(() => setStep(2), 1400),  // Beat 3: Wellness text
      setTimeout(() => setStep(3), 2400),  // Beat 4: Loading bar
      setTimeout(() => {
        setStep(4);
        setTimeout(onComplete, 300); // Trigger exit animation
      }, 4000), 
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {step < 4 && (
        <motion.div className={styles.fullscreen} exit={{ y: -50, opacity: 0 }} transition={{ duration: 0.3 }}>
          
          <AnimatePresence>
            {step >= 1 && (
              <motion.div 
                className={styles.creditChip}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={neoSpring}
              >
                Made by ID7 · Creative Edge
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            className={styles.heroIconBox}
            initial={{ scale: 0, rotate: -45 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={neoSpring}
          >
            <Compass size={80} strokeWidth={3} />
          </motion.div>

          {step >= 2 && (
            <motion.div 
              className={styles.wellnessSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={neoSpring}
            >
              <h1 className={styles.headline}>This hunt's for your whole self.</h1>
              <div className={styles.chipRow}>
                <motion.div className={`${styles.wellnessChip} ${styles.chipBlue}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...neoSpring, delay: 0.1 }}>
                  <Brain size={16} /> Mental
                </motion.div>
                <motion.div className={`${styles.wellnessChip} ${styles.chipOrange}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...neoSpring, delay: 0.2 }}>
                  <Activity size={16} /> Physical
                </motion.div>
                <motion.div className={`${styles.wellnessChip} ${styles.chipPink}`} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ ...neoSpring, delay: 0.3 }}>
                  <Heart size={16} /> Spiritual
                </motion.div>
              </div>
            </motion.div>
          )}

          {step >= 3 && (
            <motion.div 
              className={styles.loadingContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className={styles.loadingTrack}>
                <motion.div 
                  className={styles.loadingFill}
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 1.2, ease: "circInOut" }}
                />
              </div>
            </motion.div>
          )}

        </motion.div>
      )}
    </AnimatePresence>
  );
}
