import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // Update the user's specific game to 'test' mode and unlock all teams
  const gameId = '99ae21da-caf4-422d-ac7d-e981c57e770c';
  await supabase.from('game_sessions').update({ status: 'test', winner_team_id: null }).eq('id', gameId);
  await supabase.from('teams').update({ is_selected: false, current_clue_index: 0 }).eq('game_id', gameId);
  console.log('Game updated to Arcade Test Mode successfully!');
}
run();
