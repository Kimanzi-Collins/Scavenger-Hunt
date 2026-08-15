"use client";

import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./join.module.css";
import { ChevronLeft, Lock } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";
import { AnimatePresence } from "framer-motion";

type Team = {
  id: string;
  color: string;
  is_selected: boolean;
};

function JoinGameContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialGameId = searchParams.get("gameId") || "";

  const [showSplash, setShowSplash] = useState(!!initialGameId);
  const [gameId, setGameId] = useState(initialGameId);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchTeams = async (id: string) => {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("game_id", id)
      .order("color");

    if (error) {
      setError("Failed to find game. Check the ID.");
    } else if (data && data.length === 0) {
      setError("No teams found for this game.");
    } else if (data) {
      setTeams(data);
    }
    setLoading(false);
  };

  // If there's an initial gameId from the URL, automatically fetch teams
  useEffect(() => {
    if (initialGameId) {
      fetchTeams(initialGameId);
    }
  }, [initialGameId]);

  useEffect(() => {
    if (!gameId || teams.length === 0) return;

    // Subscribe to realtime team selection updates
    const channel = supabase
      .channel(`teams:game_id=eq.${gameId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "teams",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          setTeams((current) =>
            current.map((t) =>
              t.id === payload.new.id ? { ...t, is_selected: payload.new.is_selected } : t
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, teams.length]);

  const selectTeam = async (team: Team) => {
    if (team.is_selected) return;

    // Optimistic lock
    setTeams((current) =>
      current.map((t) => (t.id === team.id ? { ...t, is_selected: true } : t))
    );

    const { error } = await supabase
      .from("teams")
      .update({ is_selected: true })
      .eq("id", team.id)
      .eq("is_selected", false); // ensure it wasn't just taken

    if (error) {
      alert("This team was already taken!");
      fetchTeams(gameId); // refresh
    } else {
      // Proceed to game
      router.push(`/game/${team.id}`);
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
            <ChevronLeft size={24} /> Back
          </button>

          <motion.div 
            className={styles.content}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className={styles.title}>Join a Game</h1>
            
            {teams.length === 0 ? (
              <div className={styles.inputGroup}>
                <p className={styles.label}>Enter Game Session ID</p>
                <input 
                  type="text" 
                  className={styles.input}
                  placeholder="e.g. 1234-5678..."
                  value={gameId}
                  onChange={(e) => setGameId(e.target.value)}
                />
                {error && <p className={styles.error}>{error}</p>}
                <button 
                  className="btn-bouncy btn-blue" 
                  style={{ width: '100%', marginTop: '1rem' }}
                  onClick={() => fetchTeams(gameId)}
                  disabled={loading || !gameId}
                >
                  {loading ? "Searching..." : "Find Game"}
                </button>
              </div>
            ) : (
              <div className={styles.teamSelection}>
                <p className={styles.label}>Select your Team</p>
                <div className={styles.grid}>
                  {teams.map((team) => (
                    <motion.button
                      key={team.id}
                      whileHover={!team.is_selected ? { scale: 1.05 } : {}}
                      whileTap={!team.is_selected ? { scale: 0.95 } : {}}
                      className={`${styles.teamCard} ${styles[`team${team.color}`]} ${team.is_selected ? styles.taken : ''}`}
                      onClick={() => selectTeam(team)}
                      disabled={team.is_selected}
                    >
                      {team.is_selected && <Lock className={styles.lockIcon} size={32} />}
                      <span>{team.color}</span>
                    </motion.button>
                  ))}
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
