"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Plus, Copy, Trophy, Trash2, Edit2, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { motion, AnimatePresence } from "framer-motion";

type GameSession = { id: string; status: string; winner_team_id: string | null; created_at: string };
type Team = { id: string; color: string; completed_at: string | null };
type Clue = { id: string; team_id: string; step_number: number; pin_code: string; content: string; wellness_fact: string };

export default function AdminDashboard() {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [clues, setClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // New Clue Form State
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [clueContent, setClueContent] = useState("");
  const [wellnessFact, setWellnessFact] = useState("");
  
  // Edit Clue State
  const [editingClueId, setEditingClueId] = useState<string | null>(null);
  const [editClueContent, setEditClueContent] = useState("");
  const [editWellnessFact, setEditWellnessFact] = useState("");

  useEffect(() => {
    fetchSessions();

    const channel = supabase.channel('admin-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_sessions' }, () => {
        fetchSessions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, (payload) => {
        if (payload.new && 'game_id' in payload.new && activeGame && payload.new.game_id === activeGame.id) {
            setTeams(current => current.map(t => t.id === payload.new.id ? payload.new as Team : t));
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
    const { data: game, error: gameError } = await supabase
      .from("game_sessions")
      .insert([{ status: "active" }])
      .select()
      .single();

    if (game) {
      const colors = ["Blue", "Red", "Yellow", "Orange"];
      const teamInserts = colors.map(c => ({ game_id: game.id, color: c }));
      await supabase.from("teams").insert(teamInserts);
      fetchSessions();
      loadGameDetails(game);
    } else {
      alert("Error creating game! Did you set up .env.local with Supabase keys?\n\nDetails: " + (gameError?.message || "Unknown error"));
    }
    setLoading(false);
  };

  const deleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this game session? All associated teams and clues will be deleted.")) {
      await supabase.from("game_sessions").delete().eq("id", id);
      if (activeGame?.id === id) setActiveGame(null);
      fetchSessions();
    }
  };

  const addClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !clueContent || !wellnessFact) return;

    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
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

  const cancelEdit = () => {
    setEditingClueId(null);
    setEditClueContent("");
    setEditWellnessFact("");
  };

  const saveEditClue = async (id: string) => {
    const { data, error } = await supabase.from("clues")
      .update({ content: editClueContent, wellness_fact: editWellnessFact })
      .eq("id", id)
      .select().single();

    if (data) {
      setClues(clues.map(c => c.id === id ? data : c));
      setEditingClueId(null);
    } else {
      alert("Error saving clue: " + error?.message);
    }
  };

  const winningTeam = teams.find(t => t.id === activeGame?.winner_team_id);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        {activeGame ? (
          <button className={styles.backButton} onClick={() => setActiveGame(null)}>
            <ChevronLeft size={24} /> Back to Sessions
          </button>
        ) : (
          <button className={styles.backButton} onClick={() => router.push('/')}>
            <ChevronLeft size={24} /> Home
          </button>
        )}
        <h1 className={styles.title}>Admin Dashboard</h1>
      </header>

      <AnimatePresence mode="wait">
        {!activeGame ? (
          <motion.main key="session-list" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            <div className={styles.sessionHeader}>
              <h2>Game Sessions</h2>
              <button className="btn-bouncy btn-blue" onClick={createNewGame} disabled={loading}>
                <Plus size={20} style={{ marginRight: '0.5rem' }} /> New Session
              </button>
            </div>
            
            <div className={styles.sessionList}>
              {sessions.length === 0 && <p className={styles.emptyText}>No game sessions created yet.</p>}
              {sessions.map(session => (
                <div key={session.id} className={styles.sessionCard} onClick={() => loadGameDetails(session)}>
                  <div className={styles.sessionInfo}>
                    <h3>Session ID: {session.id.split("-")[0]}...</h3>
                    <p>Created: {new Date(session.created_at).toLocaleDateString()} {new Date(session.created_at).toLocaleTimeString()}</p>
                    <span className={`${styles.statusBadge} ${session.status === 'active' ? styles.statusActive : styles.statusCompleted}`}>
                      {session.status}
                    </span>
                  </div>
                  <button className={styles.iconButtonDanger} onClick={(e) => deleteSession(session.id, e)} title="Delete Session">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </motion.main>
        ) : (
          <motion.main key="game-details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className={styles.gameIdBox}>
              <p>Session ID (Share this):</p>
              <h3>{activeGame.id}</h3>
              <button 
                className={styles.copyButton}
                onClick={() => {
                  const link = `${window.location.origin}/join?gameId=${activeGame.id}`;
                  navigator.clipboard.writeText(link);
                  alert("Direct Join Link copied to clipboard!");
                }}
              >
                <Copy size={16} style={{ marginRight: '0.5rem' }} /> Copy Direct Join Link
              </button>
            </div>

            {winningTeam && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={styles.winnerBanner}>
                <Trophy size={48} color="gold" />
                <h2>{winningTeam.color} Team Wins!</h2>
              </motion.div>
            )}

            <div className={styles.adminGrid}>
              <div className={styles.card}>
                <h2>Add Clue</h2>
                <form onSubmit={addClue} className={styles.form}>
                  <label>Target Team</label>
                  <select value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} className={styles.input}>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.color} Team</option>)}
                  </select>

                  <label>Clue / Riddle</label>
                  <textarea className={styles.input} rows={3} value={clueContent} onChange={e => setClueContent(e.target.value)} required />

                  <label>Wellness Fact (Shown after scan)</label>
                  <textarea className={styles.input} rows={2} value={wellnessFact} onChange={e => setWellnessFact(e.target.value)} required />

                  <button type="submit" className="btn-bouncy btn-orange" style={{ width: '100%', marginTop: '1rem' }}>
                    <Plus /> Add Clue
                  </button>
                </form>
              </div>

              <div className={styles.card}>
                <h2>Manage Clues & Pins (Delphi)</h2>
                <p className={styles.subtext}>Copy pins for QR codes. Edit or delete clues below.</p>
                
                <div className={styles.clueList}>
                  {teams.map(team => (
                    <div key={team.id} className={styles.teamSection}>
                      <h3 className={styles[`text${team.color}`]}>{team.color} Team</h3>
                      {clues.filter(c => c.team_id === team.id).length === 0 && <p className={styles.emptyTextSm}>No clues yet.</p>}
                      {clues.filter(c => c.team_id === team.id).map(clue => (
                        <div key={clue.id} className={styles.clueItem}>
                          <div className={styles.clueHeader}>
                            <span className={styles.stepBadge}>Step {clue.step_number}</span>
                            <code className={styles.pinCode}>{clue.pin_code}</code>
                            <div className={styles.clueActions}>
                              {editingClueId === clue.id ? (
                                <>
                                  <button className={styles.iconButtonSuccess} onClick={() => saveEditClue(clue.id)}><Check size={16} /></button>
                                  <button className={styles.iconButton} onClick={cancelEdit}><X size={16} /></button>
                                </>
                              ) : (
                                <>
                                  <button className={styles.iconButton} onClick={() => startEditClue(clue)}><Edit2 size={16} /></button>
                                  <button className={styles.iconButtonDanger} onClick={() => deleteClue(clue.id)}><Trash2 size={16} /></button>
                                </>
                              )}
                            </div>
                          </div>
                          
                          {editingClueId === clue.id ? (
                            <div className={styles.editForm}>
                              <textarea className={styles.inputSm} value={editClueContent} onChange={e => setEditClueContent(e.target.value)} placeholder="Clue text..." />
                              <textarea className={styles.inputSm} value={editWellnessFact} onChange={e => setEditWellnessFact(e.target.value)} placeholder="Wellness fact..." />
                            </div>
                          ) : (
                            <>
                              <p className={styles.cluePreview}><strong>Clue:</strong> {clue.content}</p>
                              <p className={styles.cluePreview}><strong>Fact:</strong> {clue.wellness_fact}</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
}
