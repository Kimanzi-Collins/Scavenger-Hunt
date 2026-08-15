"use client";

import { use, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Html5Qrcode } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import Confetti from "react-confetti";
import styles from "./game.module.css";
import { CheckCircle, QrCode, AlertCircle, Trophy, Users } from "lucide-react";

type Team = { id: string; color: string; current_clue_index: number; game_id: string; is_selected: boolean };
type Clue = { id: string; step_number: number; pin_code: string; content: string; wellness_fact: string };
type GameSession = { id: string; winner_team_id: string | null };

const FUNNY_GIFS = [
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2I3aGN0a2Z4Z2l6cjJ4cWFyZ3p2a2J3YXkyeWp1aGRxaXFzeHp0eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6c2d1bXF4eTN2bXExOWIwcHhxN2Z4dWQ1bzF6M2MxbDN4YXhqayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXN6cmJ6Z3V5dWJ5M2Z2b2F5ZWQzajF5ejF6M3V6OXJzYnJzYnJzZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufnwz3wDUli7GU0/giphy.gif",
  "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG1tNXh6Z3V5dWJ5M2Z2b2F5ZWQzajF5ejF6M3V6OXJzYnJzYnJzZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13CoXDiaCcCoyk/giphy.gif"
];

const neoSpring = { type: "spring", stiffness: 400, damping: 17 };

export default function GamePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  
  // Reveal state
  const [showWellnessFact, setShowWellnessFact] = useState(false);
  const [showNextClue, setShowNextClue] = useState(false);
  
  const [randomGif, setRandomGif] = useState("");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const html5QrCode = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    fetchGameData();
    // Cleanup scanner on unmount
    return () => {
      if (html5QrCode.current) {
        try { html5QrCode.current.stop(); } catch(e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (!team?.game_id) return;

    const channel = supabase.channel(`game_${team.game_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams', filter: `game_id=eq.${team.game_id}` }, (payload) => {
        setAllTeams(current => current.map(t => t.id === payload.new.id ? payload.new as Team : t));
        if (payload.new.id === team.id) {
          setTeam(payload.new as Team);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${team.game_id}` }, (payload) => {
        setGameSession(payload.new as GameSession);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [team?.game_id]);

  const fetchGameData = async () => {
    const { data: teamData } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (teamData) {
      setTeam(teamData);
      const { data: allTeamsData } = await supabase.from("teams").select("*").eq("game_id", teamData.game_id);
      if (allTeamsData) setAllTeams(allTeamsData);
      const { data: sessionData } = await supabase.from("game_sessions").select("*").eq("id", teamData.game_id).single();
      if (sessionData) setGameSession(sessionData);
      const { data: cluesData } = await supabase.from("clues").select("*").eq("team_id", teamId).order("step_number");
      if (cluesData) {
        setClues(cluesData);
        checkWinCondition(teamData, cluesData, sessionData);
      }
    }
    setLoading(false);
  };

  const checkWinCondition = async (currentTeam: Team, currentClues: Clue[], session: GameSession | null) => {
    if (currentClues.length > 0 && currentTeam.current_clue_index >= currentClues.length) {
      if (!session?.winner_team_id) {
        await supabase.from("game_sessions").update({ winner_team_id: currentTeam.id }).eq("id", currentTeam.game_id).is("winner_team_id", null);
      }
    }
  };

  const startScanner = async () => {
    setScanning(true);
    setScanResult(null);
    
    try {
      // This immediately prompts the browser for camera permissions
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        html5QrCode.current = new Html5Qrcode("reader");
        await html5QrCode.current.start(
          { facingMode: "environment" }, // Prioritize back camera on mobile
          { fps: 10, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          onScanFailure
        );
      } else {
        alert("No cameras found on your device.");
        setScanning(false);
      }
    } catch (err) {
      alert("Camera permission denied. Please allow camera access in your browser settings to scan clues.");
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCode.current) {
      try {
        await html5QrCode.current.stop();
        html5QrCode.current.clear();
      } catch(e) {}
      html5QrCode.current = null;
    }
    setScanning(false);
  };

  const onScanSuccess = (decodedText: string) => {
    stopScanner();
    setScanResult(decodedText);
    
    const currentClue = clues[team!.current_clue_index];
    if (decodedText.includes(currentClue.pin_code)) {
      setRandomGif(FUNNY_GIFS[Math.floor(Math.random() * FUNNY_GIFS.length)]);
      setShowWellnessFact(true);
      // Auto advance to next clue reveal after 2 seconds
      setTimeout(() => setShowNextClue(true), 2000);
    } else {
      alert("Invalid QR code! This belongs to another team or clue.");
    }
  };

  const onScanFailure = (error: any) => {};

  const proceedToNextClue = async () => {
    if (!team) return;
    
    const nextIndex = team.current_clue_index + 1;
    await supabase.from("teams").update({ current_clue_index: nextIndex }).eq("id", team.id);
    
    setTeam({ ...team, current_clue_index: nextIndex });
    setShowWellnessFact(false);
    setShowNextClue(false);
    setScanResult(null);
    checkWinCondition({ ...team, current_clue_index: nextIndex }, clues, gameSession);
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (!team || !gameSession) return <div className={styles.container}>Game data not found.</div>;

  const lockedTeamsCount = allTeams.filter(t => t.is_selected).length;
  const isWaitingForPlayers = lockedTeamsCount < 4;

  if (isWaitingForPlayers) {
    return (
      <div className={styles.container}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="neo-card" style={{ maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
          <Users size={64} className={styles.pulseIcon} color="var(--color-ink)" />
          <h2 className={styles.waitingTitle}>Waiting for teams...</h2>
          <p className={styles.waitingSub}>The hunt begins when all 4 teams lock in!</p>
          <div className={styles.teamsGrid}>
            {allTeams.map((t, i) => (
              <motion.div 
                key={t.id} 
                className={`${styles.teamDot} ${t.is_selected ? styles[`bg${t.color}`] : styles.bgEmpty}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ ...neoSpring, delay: i * 0.1 }}
              >
                {t.color} {t.is_selected && <CheckCircle size={16} />}
              </motion.div>
            ))}
          </div>
          <h3 style={{ marginTop: '1.5rem', fontFamily: 'var(--font-display)' }}>{lockedTeamsCount} / 4 Ready</h3>
          
          <button 
            className="btn-bouncy btn-ink" 
            style={{ width: '100%', marginTop: '1.5rem', fontSize: '0.9rem' }}
            onClick={async () => {
              // Simulate other teams joining
              const unselectedTeams = allTeams.filter(t => !t.is_selected && t.id !== team.id);
              for (const ut of unselectedTeams) {
                await supabase.from("teams").update({ is_selected: true }).eq("id", ut.id);
              }
            }}
          >
            [Dev] Simulate Others Joining
          </button>
        </motion.div>
      </div>
    );
  }

  if (gameSession.winner_team_id) {
    const isOurTeamWinner = gameSession.winner_team_id === team.id;
    const winnerColor = allTeams.find(t => t.id === gameSession.winner_team_id)?.color;

    return (
      <div className={`${styles.container} ${isOurTeamWinner ? styles[`bg${team.color}`] : styles.bgPaper}`}>
        {isOurTeamWinner && <Confetti width={windowSize.width} height={windowSize.height} colors={['#3D5AFE', '#FF3B3B', '#FFD93D', '#FF7A00', '#0D0D0D']} />}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={neoSpring} className={styles.winnerCard}>
          {isOurTeamWinner ? (
            <>
              <Trophy size={100} strokeWidth={2.5} color="var(--color-ink)" style={{ fill: "var(--color-yellow)" }} />
              <h1>VICTORY!</h1>
              <p>Your team found all the clues first!</p>
            </>
          ) : (
            <>
              <AlertCircle size={100} strokeWidth={2.5} color="var(--color-ink)" style={{ fill: "var(--color-red)" }} />
              <h1>GAME OVER</h1>
              <p>The <strong>{winnerColor}</strong> Team won the hunt!</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  const currentClue = clues[team.current_clue_index];
  const nextClue = clues[team.current_clue_index + 1];
  const progressPercent = (team.current_clue_index / clues.length) * 100;
  const isLastClue = team.current_clue_index === clues.length - 1;

  return (
    <div className={styles.container}>
      <div className={styles.progressContainer}>
        <motion.div className={styles.progressBar} initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
      </div>

      <header className={styles.header}>
        <div className={styles.stepIndicator}>
          Clue {team.current_clue_index + 1} <span className={styles.stepTotal}>/ {clues.length}</span>
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
              transition={neoSpring}
            >
              {isLastClue && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={neoSpring} className={styles.hypeBadge}>
                  🔥 FINAL CLUE 🔥
                </motion.div>
              )}
              
              <div className={styles.clueContentWrapper}>
                <p className={styles.clueText}>{currentClue?.content || "Waiting for admin to add clues..."}</p>
              </div>
              
              {!scanning ? (
                <button className={`btn-bouncy btn-${team.color.toLowerCase()}`} onClick={startScanner} style={{ width: '100%', marginTop: '2rem' }}>
                  <QrCode size={24} style={{ marginRight: '0.5rem' }} /> Scan Target
                </button>
              ) : (
                <div className={styles.scannerWrapper}>
                  <div className={styles.scanBrackets}>
                    <div id="reader" className={styles.reader}></div>
                  </div>
                  <button className="btn-bouncy btn-ink" onClick={stopScanner} style={{ width: '100%', marginTop: '1.5rem' }}>
                    Cancel
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="wellness"
              className={styles.card}
              initial={{ rotateY: -90 }}
              animate={{ rotateY: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <h3 className={styles.factTitle}>Wellness Fact</h3>
              <div className={styles.wellnessBox}>
                <p>{currentClue.wellness_fact}</p>
              </div>

              <img src={randomGif} alt="Reaction" className={styles.trollGif} />

              <AnimatePresence>
                {showNextClue && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={neoSpring}
                    className={styles.nextClueBox}
                  >
                    <h4>{nextClue ? "Next Target" : "Final Step"}</h4>
                    <p>{nextClue ? nextClue.content : "You found all the clues! Claim victory!"}</p>
                    
                    <button className={`btn-bouncy btn-${team.color.toLowerCase()}`} onClick={proceedToNextClue} style={{ width: '100%', marginTop: '1.5rem' }}>
                      {nextClue ? "Let's Go!" : "Claim Victory!"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
