"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./join.module.css";
import { ChevronLeft, Lock } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";

type Team = {
  id: string;
  color: string;
  is_selected: boolean;
};

// Neobrutalist Spring Config
const neoSpring = { type: "spring" as const, stiffness: 400, damping: 17 };

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGameId = searchParams.get("gameId") || "";
  const skipSplash = searchParams.get("skipSplash") === "true";

  // If they arrived via ANY direct link, play the splash screen before showing the lobby
  const [showSplash, setShowSplash] = useState(!skipSplash); 
  const [gameId, setGameId] = useState(initialGameId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTeams = async (id: string) => {
    setLoading(true);
    setError("");
    
    let searchId = id;
    if (id.toLowerCase() === "test") {
      const { data: latest } = await supabase.from("game_sessions").select("id").eq("status", "test").order("created_at", { ascending: false }).limit(1).single();
      if (latest) {
        searchId = latest.id;
      } else {
        setError("No test game available.");
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.from("teams").select("*").eq("game_id", searchId).order("color");

    if (error) {
      setError("Failed to find game.");
    } else if (data && data.length === 0) {
      setError("No teams found for this game.");
    } else if (data) {
      setTeams(data);
      // Update the URL so realtime works properly on the actual ID
      setGameId(searchId); 
    }
    setLoading(false);
  };

  useEffect(() => {
    if (initialGameId) {
      fetchTeams(initialGameId);
    }
  }, [initialGameId]);

  useEffect(() => {
    if (!gameId || teams.length === 0) return;

    const channel = supabase.channel(`teams:game_id=eq.${gameId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "teams", filter: `game_id=eq.${gameId}` }, (payload) => {
        setTeams((current) => current.map((t) => t.id === payload.new.id ? { ...t, is_selected: payload.new.is_selected } : t));
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [gameId, teams.length]);

  const selectTeam = async (team: Team) => {
    if (team.is_selected) return;

    // Optimistic Lock Thump
    setTeams(current => current.map(t => (t.id === team.id ? { ...t, is_selected: true } : t)));

    const { error } = await supabase.from("teams").update({ is_selected: true }).eq("id", team.id).eq("is_selected", false);

    if (error) {
      alert("This team was already taken!");
      fetchTeams(gameId);
    } else {
      setTimeout(() => {
        router.push(`/game/${team.id}`);
      }, 600); // Give time for the satisfying thump animation before navigating
    }
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {showSplash && <SplashScreen key="splash" onComplete={() => setShowSplash(false)} />}
      </AnimatePresence>
      
      {!showSplash && (
        <div className={styles.container}>
          <button className={styles.backButton} onClick={() => router.push('/')}>
            <ChevronLeft size={24} strokeWidth={3} /> Home
          </button>

          <motion.div className={styles.content} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={neoSpring}>
            <h1 className={styles.title}>Join Lobby</h1>
            
            {teams.length === 0 ? (
              <div className="neo-card">
                <p className={styles.label}>Enter Session ID</p>
                <input type="text" className={styles.input} placeholder="e.g. 1234-5678" value={gameId} onChange={(e) => setGameId(e.target.value)} />
                {error && <p className={styles.error}>{error}</p>}
                <button className="btn-bouncy btn-blue" style={{ width: '100%', marginTop: '1rem' }} onClick={() => fetchTeams(gameId)} disabled={loading || !gameId}>
                  {loading ? "Searching..." : "Enter Lobby"}
                </button>
              </div>
            ) : (
              <div className={styles.teamSelection}>
                <p className={styles.label}>Lock in your team</p>
                <div className={styles.grid}>
                  {teams.map((team, index) => {
                    const isTakenByOther = team.is_selected; // if it's selected, it's locked.
                    
                    return (
                      <motion.button
                        key={team.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...neoSpring, delay: index * 0.07 }}
                        whileTap={!isTakenByOther ? { scale: 0.9, x: 6, y: 6, boxShadow: "0 0 0 #0D0D0D" } : {}}
                        className={`${styles.teamCard} ${styles[`team${team.color}`]} ${isTakenByOther ? styles.taken : ''}`}
                        onClick={() => selectTeam(team)}
                        disabled={isTakenByOther}
                      >
                        <span>{team.color}</span>
                        
                        <AnimatePresence>
                          {isTakenByOther && (
                            <motion.div 
                              className={styles.lockBadge}
                              initial={{ scale: 0, rotate: -45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={neoSpring}
                            >
                              <Lock size={20} strokeWidth={3} />
                              <span>Taken</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}

export default function JoinGame() {
  return (
    <Suspense fallback={<div className={styles.container}>Loading...</div>}>
      <JoinGameContent />
    </Suspense>
  );
}
