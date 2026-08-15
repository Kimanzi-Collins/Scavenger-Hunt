"use client";

import { use, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Html5QrcodeScanner } from "html5-qrcode";
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

export default function GamePage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = use(params);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [showWellnessFact, setShowWellnessFact] = useState(false);
  const [randomGif, setRandomGif] = useState("");
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    fetchGameData();
  }, []);

  useEffect(() => {
    if (!team?.game_id) return;

    // Realtime subscriptions for game start and game over
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
      
      // Fetch all teams to check if game is ready
      const { data: allTeamsData } = await supabase.from("teams").select("*").eq("game_id", teamData.game_id);
      if (allTeamsData) setAllTeams(allTeamsData);

      // Fetch game session to check if someone won
      const { data: sessionData } = await supabase.from("game_sessions").select("*").eq("id", teamData.game_id).single();
      if (sessionData) setGameSession(sessionData);

      // Fetch clues
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
        // We won!
        await supabase.from("game_sessions").update({ winner_team_id: currentTeam.id }).eq("id", currentTeam.game_id).is("winner_team_id", null);
      }
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
    
    const currentClue = clues[team!.current_clue_index];
    if (decodedText.includes(currentClue.pin_code)) {
      setRandomGif(FUNNY_GIFS[Math.floor(Math.random() * FUNNY_GIFS.length)]);
      setShowWellnessFact(true);
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
    setScanResult(null);
    checkWinCondition({ ...team, current_clue_index: nextIndex }, clues, gameSession);
  };

  if (loading) return <div className={styles.container}>Loading...</div>;
  if (!team || !gameSession) return <div className={styles.container}>Game data not found.</div>;

  // 1. Waiting for players state
  const lockedTeamsCount = allTeams.filter(t => t.is_selected).length;
  const isWaitingForPlayers = lockedTeamsCount < 4;

  if (isWaitingForPlayers) {
    return (
      <div className={styles.container}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={styles.waitingRoom}>
          <Users size={64} className={styles.pulseIcon} color="var(--color-blue)" />
          <h2>Waiting for teams...</h2>
          <p>The hunt begins when all 4 teams lock in!</p>
          <div className={styles.teamsGrid}>
            {allTeams.map(t => (
              <div key={t.id} className={`${styles.teamDot} ${t.is_selected ? styles[`bg${t.color}`] : styles.bgEmpty}`}>
                {t.color} {t.is_selected ? 'Ready' : 'Waiting'}
              </div>
            ))}
          </div>
          <h3>{lockedTeamsCount} / 4 Ready</h3>
        </motion.div>
      </div>
    );
  }

  // 2. Game Over state (Someone won)
  if (gameSession.winner_team_id) {
    const isOurTeamWinner = gameSession.winner_team_id === team.id;
    const winnerColor = allTeams.find(t => t.id === gameSession.winner_team_id)?.color;

    return (
      <div className={`${styles.container} ${isOurTeamWinner ? styles[`bg${team.color}`] : ''}`}>
        {isOurTeamWinner && <Confetti width={windowSize.width} height={windowSize.height} />}
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.winnerCard}>
          {isOurTeamWinner ? (
            <>
              <Trophy size={80} color="var(--color-yellow)" />
              <h1>Victory!</h1>
              <p>Your team found all the clues first!</p>
            </>
          ) : (
            <>
              <AlertCircle size={80} color="var(--color-red)" />
              <h1>Game Over!</h1>
              <p>The <strong>{winnerColor}</strong> Team won the hunt!</p>
              <p>Better luck next time!</p>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  // 3. Active Gameplay
  const currentClue = clues[team.current_clue_index];
  const nextClue = clues[team.current_clue_index + 1];
  const progressPercent = (team.current_clue_index / clues.length) * 100;
  const isLastClue = team.current_clue_index === clues.length - 1;

  return (
    <div className={styles.container}>
      {/* Animated Progress Bar */}
      <div className={styles.progressContainer}>
        <motion.div 
          className={styles.progressBar} 
          initial={{ width: 0 }} 
          animate={{ width: `${progressPercent}%` }} 
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      </div>

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
              {isLastClue && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                  className={styles.hypeBadge}
                >
                  🔥 You're so close! Final Clue! 🔥
                </motion.div>
              )}
              <h3>Find this clue:</h3>
              <p className={styles.clueText}>{currentClue?.content || "Waiting for admin to add clues..."}</p>
              
              {!scanning ? (
                <button className={`btn-bouncy btn-${team.color.toLowerCase()}`} onClick={startScanner} style={{ width: '100%', marginTop: '2rem' }}>
                  <QrCode size={24} style={{ marginRight: '0.5rem' }} /> Scan QR when found
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
              <h3 className={styles.factTitle}>🎉 Clue Found! 🎉</h3>

              <div className={styles.wellnessBox}>
                <h4>Wellness Fact:</h4>
                <p>{currentClue.wellness_fact}</p>
              </div>

              {/* TROLL GIF */}
              <img src={randomGif} alt="Funny reaction" className={styles.trollGif} />

              {/* Show NEXT clue on the bottom if it exists */}
              {nextClue ? (
                <div className={styles.nextClueBox}>
                  <h4>Next Clue:</h4>
                  <p>{nextClue.content}</p>
                </div>
              ) : (
                <div className={styles.nextClueBox}>
                  <h4>Final Step!</h4>
                  <p>You found all the clues! Click finish to claim victory!</p>
                </div>
              )}
              
              <button className={`btn-bouncy btn-${team.color.toLowerCase()}`} onClick={proceedToNextClue} style={{ width: '100%', marginTop: '1.5rem' }}>
                {nextClue ? "Got it! Go to next step" : "Claim Victory!"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
