"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Plus, Copy, Trophy, Trash2, Edit2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { motion, AnimatePresence } from "framer-motion";

type GameSession = { id: string; status: string; winner_team_id: string | null; created_at: string };
type Team = { id: string; game_id: string; color: string; current_clue_index: number; is_selected: boolean };
type Clue = { id: string; team_id: string; step_number: number; pin_code: string; content: string; wellness_fact: string };

const neoSpring = { type: "spring" as const, stiffness: 400, damping: 17 };

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [clueContent, setClueContent] = useState("");
  const [wellnessFact, setWellnessFact] = useState("");
  
  const [editingClueId, setEditingClueId] = useState<string | null>(null);
  const [editClueContent, setEditClueContent] = useState("");
  const [editWellnessFact, setEditWellnessFact] = useState("");

  useEffect(() => {
    fetchSessions();

    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, (payload) => {
        fetchSessions();
        const updatedGame = payload.new as GameSession;
        setActiveGame(current => (current && updatedGame && current.id === updatedGame.id) ? updatedGame : current);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        const newTeam = payload.new as Team;
        if (newTeam && activeGame && newTeam.game_id === activeGame.id) {
            setTeams(current => current.map(t => t.id === newTeam.id ? newTeam : t));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeGame?.id]);

  const fetchSessions = async () => {
    const { data } = await supabase.from("game_sessions").select("*").order("created_at", { ascending: false });
    if (data) setSessions(data);
  };

  const loadGameDetails = async (game: GameSession) => {
    setActiveGame(game);
    const { data: teamData } = await supabase.from("teams").select("*").eq("game_id", game.id).order("color");
    if (teamData) {
      setTeams(teamData);
      if (teamData.length > 0) setSelectedTeamId(teamData[0].id);
      
      const { data: cluesData } = await supabase.from("clues").select("*").in("team_id", teamData.map(t => t.id)).order("step_number");
      if (cluesData) setClues(cluesData);
    }
  };

  const createNewGame = async () => {
    setLoading(true);
    const { data: game, error: gameError } = await supabase.from("game_sessions").insert([{ status: "active" }]).select().single();
    if (game) {
      const colors = ["Blue", "Red", "Yellow", "Orange"];
      const teamInserts = colors.map(c => ({ game_id: game.id, color: c }));
      await supabase.from("teams").insert(teamInserts);
      fetchSessions();
      loadGameDetails(game);
    } else {
      alert("Error creating game: " + (gameError?.message || "Unknown error"));
    }
    setLoading(false);
  };

  const createTestGame = async () => {
    setLoading(true);
    const { data: game, error: gameError } = await supabase.from("game_sessions").insert([{ status: "test" }]).select().single();
    if (game) {
      const colors = ["Blue", "Red", "Yellow", "Orange"];
      const teamInserts = colors.map(c => ({ game_id: game.id, color: c }));
      
      const { data: createdTeams } = await supabase.from("teams").insert(teamInserts).select();
      
      if (createdTeams) {
        // Create 1 clue for each team with pin '123456' so you win automatically after 1 scan
        const testClues = createdTeams.map(t => ({
          team_id: t.id,
          step_number: 1,
          pin_code: '123456',
          content: 'This is the test clue. Scan the 123456 QR code to win!',
          wellness_fact: 'Did you know? Taking breaks makes you 50% more productive!'
        }));
        await supabase.from("clues").insert(testClues);
      }

      fetchSessions();
      loadGameDetails(game);
      alert("Test game created! You can now go to Join and type 'test' as the code.");
    } else {
      alert("Error creating test game: " + (gameError?.message || "Unknown error"));
    }
    setLoading(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure? Delete this session?")) {
      await supabase.from("game_sessions").delete().eq("id", id);
      if (activeGame?.id === id) setActiveGame(null);
      fetchSessions();
    }
  };

  const resetActiveSession = async () => {
    if (!activeGame) return;
    if (confirm("Reset this game? This will unlock all teams and clear progress.")) {
      await supabase.from("game_sessions").update({ winner_team_id: null, status: 'active' }).eq("id", activeGame.id);
      await supabase.from("teams").update({ current_clue_index: 0, is_selected: false }).eq("game_id", activeGame.id);
      alert("Game has been reset!");
    }
  };

  const addClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !clueContent || !wellnessFact) return;

    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const teamClues = clues.filter(c => c.team_id === selectedTeamId);
    const stepNumber = teamClues.length + 1;

    const { data, error } = await supabase.from("clues").insert([{
      team_id: selectedTeamId, step_number: stepNumber, pin_code: pin, content: clueContent, wellness_fact: wellnessFact
    }]).select().single();

    if (data) {
      setClues([...clues, data]);
      setClueContent("");
      setWellnessFact("");
    } else alert("Error adding clue: " + error?.message);
  };

  const deleteClue = async (id: string) => {
    if (confirm("Delete this clue?")) {
      await supabase.from("clues").delete().eq("id", id);
      setClues(clues.filter(c => c.id !== id));
    }
  };

  const startEditClue = (clue: Clue) => {
    setEditingClueId(clue.id);
    setEditClueContent(clue.content);
    setEditWellnessFact(clue.wellness_fact);
  };

  const saveEditClue = async (id: string) => {
    const { data } = await supabase.from("clues").update({ content: editClueContent, wellness_fact: editWellnessFact }).eq("id", id).select().single();
    if (data) {
      setClues(clues.map(c => c.id === id ? data : c));
      setEditingClueId(null);
    }
  };

  const winningTeam = teams.find(t => t.id === activeGame?.winner_team_id);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {activeGame ? (
          <button className={styles.backButton} onClick={() => setActiveGame(null)}>
            <ChevronLeft size={24} strokeWidth={3} /> Back
          </button>
        ) : (
          <button className={styles.backButton} onClick={() => router.push('/')}>
            <ChevronLeft size={24} strokeWidth={3} /> Home
          </button>
        )}
        <h1 className={styles.title}>Admin Workspace</h1>
      </header>

      <AnimatePresence mode="wait">
        {!activeGame ? (
          <motion.main key="session-list" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={neoSpring}>
            <div className={styles.sessionHeader} style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-bouncy btn-blue" onClick={createNewGame} disabled={loading}>
                <Plus size={20} style={{ marginRight: '0.5rem' }} /> New Session
              </button>
              
              <button className="btn-bouncy btn-yellow" onClick={createTestGame} disabled={loading}>
                Create 'TEST' Game
              </button>
            </div>
            
            <div className={styles.sessionList}>
              {sessions.length === 0 && <p className={styles.emptyText}>No game sessions created yet.</p>}
              {sessions.map((session, i) => (
                <motion.div 
                  key={session.id} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  transition={{ ...neoSpring, delay: i * 0.05 }}
                  className={styles.sessionCard} 
                  onClick={() => loadGameDetails(session)}
                >
                  <div className={styles.sessionInfo}>
                    <h3>ID: {session.id.split("-")[0]}</h3>
                    <p>{new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString()}</p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span className={`${styles.statusBadge} ${session.status === 'active' ? styles.statusActive : styles.statusCompleted}`}>
                      {session.status}
                    </span>
                    <button className={styles.iconBtnDanger} onClick={(e) => deleteSession(session.id, e)}>
                      <Trash2 size={20} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.main>
        ) : (
          <motion.main key="game-details" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={neoSpring}>
            
            {/* Live Leaderboard row */}
            <div className={styles.leaderboardRow}>
              {teams.map(t => (
                <div key={t.id} className={`${styles.leaderboardCard} ${styles[`bg${t.color}`]}`}>
                  <span className={styles.lbColor}>{t.color}</span>
                  <span className={styles.lbStep}>Step {t.current_clue_index}</span>
                  {t.is_selected && <Check size={16} />}
                </div>
              ))}
            </div>

            <div className={styles.gameIdBox} style={{ flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                <div>
                  <p>Session Direct Link</p>
                  <h3>{`${window.location.origin}/join?gameId=${activeGame.id}`}</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn-bouncy btn-ink" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/join?gameId=${activeGame.id}`)}>
                    <Copy size={16} style={{ marginRight: '0.5rem' }} /> Copy Link
                  </button>
                  <button className="btn-bouncy btn-red" onClick={resetActiveSession}>
                    Reset Game
                  </button>
                </div>
              </div>
            </div>

            {winningTeam && (
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className={styles.winnerBanner}>
                <Trophy size={48} color="var(--color-ink)" style={{ fill: 'var(--color-yellow)' }} />
                <h2>{winningTeam.color} Team Won!</h2>
              </motion.div>
            )}

            <div className={styles.adminGrid}>
              <div className="neo-card">
                <h2>Add Clue</h2>
                <form onSubmit={addClue} className={styles.form}>
                  <label>Target Team</label>
                  <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className={styles.input}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.color} Team</option>)}
                  </select>

                  <label>Clue / Riddle</label>
                  <textarea className={styles.input} rows={3} value={clueContent} onChange={e => setClueContent(e.target.value)} required />

                  <label>Wellness Fact</label>
                  <textarea className={styles.input} rows={2} value={wellnessFact} onChange={e => setWellnessFact(e.target.value)} required />

                  <button type="submit" className="btn-bouncy btn-success" style={{ width: '100%', marginTop: '1rem' }}>
                    <Plus /> Add Clue
                  </button>
                </form>
              </div>

              <div className="neo-card">
                <h2>Clues & Pins</h2>
                <p className={styles.subtext}>Copy pins for QR generation in Delphi.</p>
                
                <div className={styles.clueList}>
                  {teams.map(team => {
                    const teamClues = clues.filter(c => c.team_id === team.id);
                    if (teamClues.length === 0) return null;
                    return (
                      <div key={team.id} className={styles.teamSection}>
                        <h3 className={styles[`text${team.color}`]}>{team.color}</h3>
                        {teamClues.map(clue => (
                          <div key={clue.id} className={styles.clueItem}>
                            <div className={styles.clueHeader}>
                              <span className={styles.stepBadge}>{clue.step_number}</span>
                              
                              {/* The "Receipt" style pin */}
                              <div className={styles.receiptPin} onClick={() => navigator.clipboard.writeText(clue.pin_code)}>
                                <code>{clue.pin_code}</code>
                                <Copy size={12} />
                              </div>

                              <div className={styles.clueActions}>
                                {editingClueId === clue.id ? (
                                  <>
                                    <button className={styles.iconBtnSuccess} onClick={() => saveEditClue(clue.id)}><Check size={16} /></button>
                                    <button className={styles.iconBtnDanger} onClick={() => setEditingClueId(null)}><X size={16} /></button>
                                  </>
                                ) : (
                                  <>
                                    <button className={styles.iconBtnBase} onClick={() => startEditClue(clue)}><Edit2 size={16} /></button>
                                    <button className={styles.iconBtnDanger} onClick={() => deleteClue(clue.id)}><Trash2 size={16} /></button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {editingClueId === clue.id ? (
                              <div className={styles.editForm}>
                                <textarea className={styles.inputSm} value={editClueContent} onChange={e => setEditClueContent(e.target.value)} />
                                <textarea className={styles.inputSm} value={editWellnessFact} onChange={e => setEditWellnessFact(e.target.value)} />
                              </div>
                            ) : (
                              <>
                                <p className={styles.cluePreview}><strong>C:</strong> {clue.content}</p>
                                <p className={styles.cluePreview}><strong>W:</strong> {clue.wellness_fact}</p>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
