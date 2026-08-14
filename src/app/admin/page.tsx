"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Plus, Copy, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { motion } from "framer-motion";

type GameSession = { id: string; status: string; winner_team_id: string | null };
type Team = { id: string; color: string; completed_at: string | null };

export default function AdminDashboard() {
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // New Clue Form State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [clueContent, setClueContent] = useState("");
  const [wellnessFact, setWellnessFact] = useState("");

  const [clues, setClues] = useState<any[]>([]);

  const fetchActiveGame = async () => {
    // Just fetch the latest for simplicity in this demo
    const { data } = await supabase.from("game_sessions").select("*").order("created_at", { ascending: false }).limit(1);
    if (data && data.length > 0) {
      setActiveGame(data[0]);
      fetchTeams(data[0].id);
    }
  };

  const fetchTeams = async (gameId: string) => {
    const { data } = await supabase.from("teams").select("*").eq("game_id", gameId).order("color");
    if (data) {
      setTeams(data);
      if (data.length > 0) setSelectedTeamId(data[0].id);
      
      const { data: cluesData } = await supabase.from("clues").select("*").in("team_id", data.map(t => t.id));
      if (cluesData) setClues(cluesData);
    }
  };

  useEffect(() => {
    fetchActiveGame();

    // Subscribe to winner changes
    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'game_sessions' }, 
        (payload) => {
          setActiveGame(payload.new as GameSession);
        })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'teams' },
        (payload) => {
          setTeams(current => current.map(t => t.id === payload.new.id ? payload.new as Team : t));
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const createNewGame = async () => {
    setLoading(true);
    const { data: game, error: gameError } = await supabase
      .from("game_sessions")
      .insert([{ status: "active" }])
      .select()
      .single();

    if (game) {
      const colors = ["Blue", "Red", "Yellow", "Orange"];
      const teamInserts = colors.map(c => ({ game_id: game.id, color: c }));
      await supabase.from("teams").insert(teamInserts);
      fetchActiveGame();
    }
    setLoading(false);
  };

  const addClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !clueContent || !wellnessFact) return;

    // Generate random 6 character alphanumeric pin
    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    // Calculate step number
    const teamClues = clues.filter(c => c.team_id === selectedTeamId);
    const stepNumber = teamClues.length + 1;

    const { data, error } = await supabase.from("clues").insert([{
      team_id: selectedTeamId,
      step_number: stepNumber,
      pin_code: pin,
      content: clueContent,
      wellness_fact: wellnessFact
    }]).select().single();

    if (data) {
      setClues([...clues, data]);
      setClueContent("");
      setWellnessFact("");
    } else {
      alert("Error adding clue: " + error?.message);
    }
  };

  const winningTeam = teams.find(t => t.id === activeGame?.winner_team_id);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => router.push('/')}>
          <ChevronLeft size={24} /> Home
        </button>
        <h1 className={styles.title}>Admin Dashboard</h1>
        {!activeGame ? (
          <button className="btn-bouncy btn-blue" onClick={createNewGame} disabled={loading}>
            Create New Game
          </button>
        ) : (
          <div className={styles.gameIdBox}>
            <p>Session ID (Share this):</p>
            <h3>{activeGame.id}</h3>
          </div>
        )}
      </header>

      {activeGame && (
        <main className={styles.main}>
          {winningTeam && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.winnerBanner}>
              <Trophy size={48} color="gold" />
              <h2>{winningTeam.color} Team Wins!</h2>
            </motion.div>
          )}

          <div className={styles.adminGrid}>
            {/* Clue Creation Form */}
            <div className={styles.card}>
              <h2>Add Clue</h2>
              <form onSubmit={addClue} className={styles.form}>
                <label>Target Team</label>
                <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className={styles.input}>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.color} Team</option>)}
                </select>

                <label>Clue / Riddle</label>
                <textarea 
                  className={styles.input} 
                  rows={3} 
                  value={clueContent} 
                  onChange={e => setClueContent(e.target.value)} 
                  required
                />

                <label>Wellness Fact (Shown after scan)</label>
                <textarea 
                  className={styles.input} 
                  rows={2} 
                  value={wellnessFact} 
                  onChange={e => setWellnessFact(e.target.value)}
                  required 
                />

                <button type="submit" className="btn-bouncy btn-orange" style={{ width: '100%', marginTop: '1rem' }}>
                  <Plus /> Add Clue
                </button>
              </form>
            </div>

            {/* Generated Pins for Delphi */}
            <div className={styles.card}>
              <h2>Generated Pins for QR (Delphi)</h2>
              <p className={styles.subtext}>Copy these pins to generate color-coded QR codes.</p>
              
              <div className={styles.clueList}>
                {teams.map(team => (
                  <div key={team.id} className={styles.teamSection}>
                    <h3 className={styles[`text${team.color}`]}>{team.color} Team</h3>
                    {clues.filter(c => c.team_id === team.id).map(clue => (
                      <div key={clue.id} className={styles.clueItem}>
                        <span className={styles.stepBadge}>Step {clue.step_number}</span>
                        <code className={styles.pinCode}>{clue.pin_code}</code>
                        <p className={styles.cluePreview}>{clue.content}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
