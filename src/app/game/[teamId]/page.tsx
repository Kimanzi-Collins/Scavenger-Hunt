"use client";

import { use, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Html5QrcodeScanner } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import styles from "./game.module.css";
import { CheckCircle, QrCode } from "lucide-react";

type Team = { id: string; color: string; current_clue_index: number; game_id: string };
type Clue = { id: string; step_number: number; pin_code: string; content: string; wellness_fact: string };

export default function GamePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [clues, setClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showWellnessFact, setShowWellnessFact] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    fetchGameData();
  }, []);

  const fetchGameData = async () => {
    const { data: teamData } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (teamData) {
      setTeam(teamData);
      const { data: cluesData } = await supabase.from("clues").select("*").eq("team_id", teamId).order("step_number");
      if (cluesData) {
        setClues(cluesData);
        checkWinCondition(teamData, cluesData);
      }
    }
    setLoading(false);
  };

  const checkWinCondition = async (currentTeam: Team, currentClues: Clue[]) => {
    if (currentClues.length > 0 && currentTeam.current_clue_index >= currentClues.length) {
      setIsWinner(true);
      // Update global game session winner if not already set
      await supabase.from("game_sessions").update({ winner_team_id: currentTeam.id }).eq("id", currentTeam.game_id).is("winner_team_id", null);
    }
  };

  const startScanner = () => {
    setScanning(true);
    setScanResult(null);
    setTimeout(() => {
      scannerRef.current = new Html5QrcodeScanner("reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scannerRef.current.render(onScanSuccess, onScanFailure);
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = (decodedText: string) => {
    stopScanner();
    setScanResult(decodedText);
    
    // Validate if the decoded text contains the current clue's pin
    if (team && currentClue) {
      if (decodedText.includes(currentClue.pin_code)) {
        setShowWellnessFact(true);
      } else {
        alert("Invalid QR code! This belongs to another team or clue.");
      }
    }
  };

  const onScanFailure = (error: any) => {
    // silently fail until success
  };

  const proceedToNextClue = async () => {
    if (!team) return;
    
    const nextIndex = team.current_clue_index + 1;
    await supabase.from("teams").update({ current_clue_index: nextIndex }).eq("id", team.id);
    
    setTeam({ ...team, current_clue_index: nextIndex });
    setShowWellnessFact(false);
    setScanResult(null);
    checkWinCondition({ ...team, current_clue_index: nextIndex }, clues);
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (!team) return <div className={styles.container}>Team not found.</div>;

  const currentClue = clues[team.current_clue_index];

  if (isWinner) {
    return (
      <div className={`${styles.container} ${styles[`bg${team.color}`]}`}>
        <Confetti width={windowSize.width} height={windowSize.height} />
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.winnerCard}>
          <CheckCircle size={80} color="var(--color-success)" />
          <h1>Victory!</h1>
          <p>Your team has completed the wellness hunt!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={`${styles.header} ${styles[`bg${team.color}`]}`}>
        <h2>{team.color} Team</h2>
        <div className={styles.progress}>
          Step {team.current_clue_index + 1} of {clues.length}
        </div>
      </header>

      <main className={styles.main}>
        <AnimatePresence mode="wait">
          {!showWellnessFact ? (
            <motion.div 
              key="clue"
              className={styles.card}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <h3>Current Clue</h3>
              <p className={styles.clueText}>{currentClue?.content || "Waiting for admin to add clues..."}</p>
              
              {!scanning ? (
                <button className={`btn-bouncy btn-${team.color.toLowerCase()}`} onClick={startScanner} style={{ width: '100%', marginTop: '2rem' }}>
                  <QrCode size={24} style={{ marginRight: '0.5rem' }} /> Scan QR
                </button>
              ) : (
                <div className={styles.scannerWrapper}>
                  <div id="reader" className={styles.reader}></div>
                  <button className="btn-bouncy btn-disabled" onClick={stopScanner} style={{ width: '100%', marginTop: '1rem' }}>
                    Cancel Scan
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="wellness"
              className={styles.card}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <div className={styles.successIcon}>
                <CheckCircle size={64} color="var(--color-success)" />
              </div>
              <h3>Clue Found!</h3>
              <div className={styles.wellnessBox}>
                <h4>Wellness Fact:</h4>
                <p>{currentClue.wellness_fact}</p>
              </div>
              
              <button className={`btn-bouncy btn-${team.color.toLowerCase()}`} onClick={proceedToNextClue} style={{ width: '100%', marginTop: '2rem' }}>
                Next Clue
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
