"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";
import { HeartPulse } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  return (
    <main className={styles.main}>
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />
        ) : (
          <motion.div
            key="menu"
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
