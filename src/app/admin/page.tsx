"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, Plus, Copy, Trophy, Trash2, Edit2, Check, X, Image as ImageIcon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { motion, AnimatePresence } from "framer-motion";

type GameSession = { id: string; status: string; winner_team_id: string | null; created_at: string };
type Team = { id: string; game_id: string; color: string; current_clue_index: number; is_selected: boolean; completed_at: string | null };
type Clue = { id: string; team_id: string; step_number: number; pin_code: string; content: string; wellness_fact: string };

const neoSpring = { type: "spring" as const, stiffness: 400, damping: 17 };

const AVAILABLE_GIFS = [
  { id: "random", name: "Random Funny GIF", url: "" },
  { id: "highfive", name: "High Five", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN2I3aGN0a2Z4Z2l6cjJ4cWFyZ3p2a2J3YXkyeWp1aGRxaXFzeHp0eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif" },
  { id: "dance", name: "Troll Dance", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMjR6c2d1bXF4eTN2bXExOWIwcHhxN2Z4dWQ1bzF6M2MxbDN4YXhqayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif" },
  { id: "mindblown", name: "Mind Blown", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbXN6cmJ6Z3V5dWJ5M2Z2b2F5ZWQzajF5ejF6M3V6OXJzYnJzYnJzZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26ufnwz3wDUli7GU0/giphy.gif" },
  { id: "celebrate", name: "Office Celebrate", url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExaG1tNXh6Z3V5dWJ5M2Z2b2F5ZWQzajF5ejF6M3V6OXJzYnJzYnJzZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/13CoXDiaCcCoyk/giphy.gif" }
];

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
  const [selectedGif, setSelectedGif] = useState("");
  
  const [editingClueId, setEditingClueId] = useState<string | null>(null);
  const [editClueContent, setEditClueContent] = useState("");
  const [editWellnessFact, setEditWellnessFact] = useState("");
  const [editSelectedGif, setEditSelectedGif] = useState("");

  const [gifSearchOpen, setGifSearchOpen] = useState(false);
  const [gifSearchQuery, setGifSearchQuery] = useState("");
  const [gifResults, setGifResults] = useState<{id: string, url: string, preview: string}[]>([]);
  const [isSearchingGifs, setIsSearchingGifs] = useState(false);
  const [gifModalTarget, setGifModalTarget] = useState<'add' | 'edit'>('add');

  const searchGifs = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!gifSearchQuery) return;
    setIsSearchingGifs(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;
      if (!apiKey) {
        alert("Please add NEXT_PUBLIC_GIPHY_API_KEY to your .env.local file to enable GIF search!");
        setIsSearchingGifs(false);
        return;
      }
      const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(gifSearchQuery)}&limit=24`);
      const data = await res.json();
      if (data.data) {
        setGifResults(data.data.map((g: any) => ({
          id: g.id,
          url: g.images.original.url,
          preview: g.images.fixed_height_small.url
        })));
      }
    } catch (err) {
      alert("Failed to search GIFs.");
    }
    setIsSearchingGifs(false);
  };

  const handleSelectGif = (url: string) => {
    if (gifModalTarget === 'add') setSelectedGif(url);
    else setEditSelectedGif(url);
    setGifSearchOpen(false);
  };

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
      await supabase.from("game_sessions").update({ winner_team_id: null }).eq("id", activeGame.id);
      await supabase.from("teams").update({ current_clue_index: 0, is_selected: false, completed_at: null }).eq("game_id", activeGame.id);
      alert("Game has been reset!");
    }
  };

  const addClue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId || !clueContent || !wellnessFact) return;

    const pin = Math.random().toString(36).substring(2, 8).toUpperCase();
    const teamClues = clues.filter(c => c.team_id === selectedTeamId);
    const stepNumber = teamClues.length + 1;
    
    const finalWellnessFact = selectedGif ? `${wellnessFact}|||${selectedGif}` : wellnessFact;

    const { data, error } = await supabase.from("clues").insert([{
      team_id: selectedTeamId, step_number: stepNumber, pin_code: pin, content: clueContent, wellness_fact: finalWellnessFact
    }]).select().single();

    if (data) {
      setClues([...clues, data]);
      setClueContent("");
      setWellnessFact("");
      setSelectedGif("");
    } else alert("Error adding clue: " + error?.message);
  };

  const deleteClue = async (id: string) => {
    if (confirm("Delete this clue?")) {
      await supabase.from("clues").delete().eq("id", id);
      setClues(clues.filter(c => c.id !== id));
    }
  };

  const startEditClue = (clue: Clue) => {
    const [factText, gifUrl] = clue.wellness_fact.split("|||");
    setEditingClueId(clue.id);
    setEditClueContent(clue.content);
    setEditWellnessFact(factText || "");
    setEditSelectedGif(gifUrl || "");
  };

  const saveEditClue = async (id: string) => {
    const finalWellnessFact = editSelectedGif ? `${editWellnessFact}|||${editSelectedGif}` : editWellnessFact;
    const { data } = await supabase.from("clues").update({ content: editClueContent, wellness_fact: finalWellnessFact }).eq("id", id).select().single();
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

                  <label>Reaction GIF (Optional)</label>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <button type="button" className="btn-bouncy btn-blue" onClick={() => { setGifModalTarget('add'); setGifSearchOpen(true); }}>
                      <ImageIcon size={20} style={{ marginRight: '0.5rem' }} /> Search Giphy
                    </button>
                    {selectedGif && (
                      <div style={{ position: 'relative' }}>
                        <img src={selectedGif} alt="Selected" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: '4px', border: '2px solid var(--color-ink)' }} />
                        <button type="button" onClick={() => setSelectedGif("")} style={{ position: 'absolute', top: -10, right: -10, background: 'var(--color-red)', color: 'white', borderRadius: '50%', border: '2px solid var(--color-ink)', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14}/></button>
                      </div>
                    )}
                  </div>

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
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <button type="button" className="btn-bouncy btn-blue" style={{ flex: 1, padding: '0.5rem', fontSize: '0.9rem' }} onClick={() => { setGifModalTarget('edit'); setGifSearchOpen(true); }}>
                                    <ImageIcon size={16} style={{ marginRight: '0.5rem' }} /> Search Giphy
                                  </button>
                                  {editSelectedGif && (
                                    <div style={{ position: 'relative' }}>
                                      <img src={editSelectedGif} alt="Selected" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '4px', border: '2px solid var(--color-ink)' }} />
                                      <button type="button" onClick={() => setEditSelectedGif("")} style={{ position: 'absolute', top: -8, right: -8, background: 'var(--color-red)', color: 'white', borderRadius: '50%', border: '2px solid var(--color-ink)', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}><X size={12}/></button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className={styles.cluePreview}><strong>C:</strong> {clue.content}</p>
                                <p className={styles.cluePreview}><strong>W:</strong> {clue.wellness_fact.split("|||")[0]}</p>
                                {clue.wellness_fact.split("|||")[1] && (
                                  <img 
                                    src={clue.wellness_fact.split("|||")[1]} 
                                    alt="Preview" 
                                    style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '2px solid var(--color-ink)', marginTop: '0.5rem' }} 
                                  />
                                )}
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

      <AnimatePresence>
        {gifSearchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.modalOverlay}>
            <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className="neo-card" style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>Search Giphy</h3>
                <button className={styles.iconBtnDanger} onClick={() => setGifSearchOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={searchGifs} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <input type="text" className={styles.input} placeholder="Search for a GIF..." value={gifSearchQuery} onChange={e => setGifSearchQuery(e.target.value)} autoFocus />
                <button type="submit" className="btn-bouncy btn-ink" disabled={isSearchingGifs}>
                  <Search size={20} />
                </button>
              </form>
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', padding: '0.5rem' }}>
                {isSearchingGifs && <p style={{ gridColumn: '1 / -1', textAlign: 'center' }}>Searching...</p>}
                {!isSearchingGifs && gifResults.map(g => (
                  <motion.img 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={g.id} 
                    src={g.preview} 
                    alt="GIF" 
                    onClick={() => handleSelectGif(g.url)} 
                    style={{ width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', borderRadius: '4px', border: '2px solid var(--color-ink)' }} 
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
