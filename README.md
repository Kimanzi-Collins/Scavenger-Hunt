<div align="center">
  
  <!-- Animated Typing Title -->
  <a href="https://git.io/typing-svg">
    <img src="https://readme-typing-svg.herokuapp.com?font=Space+Grotesk&weight=900&size=40&pause=1000&color=0D0D0D&center=true&vCenter=true&width=800&lines=Wellness+Scavenger+Hunt;Awwwards+Level+Neobrutalism;Scan.+Discover.+Win." alt="Typing SVG" />
  </a>

  <br />

  <!-- Animated Badges -->
  <img src="https://img.shields.io/badge/Next.js-0D0D0D?style=for-the-badge&logo=next.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" />
  <img src="https://img.shields.io/badge/Netlify-00C7B7?style=for-the-badge&logo=netlify&logoColor=white" />

  <br /><br />
  
  <!-- Hero Animated Graphic (Placeholder for a high-energy GIF) -->
  <img src="https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif" width="600" style="border: 4px solid #0D0D0D; border-radius: 16px; box-shadow: 8px 8px 0px #0D0D0D;" />

  <h3>A high-energy, physical, Neobrutalist web app for hosting competitive wellness scavenger hunts in real-time.</h3>

</div>

---

## 🌪️ The Vibe: Neobrutalism Design System
This application breaks away from boring, generic UI. It is built strictly on **Neobrutalist** principles:
- **Zero Soft Blurs**: Drop shadows are hard, unapologetic `6px 6px 0px #0D0D0D` offsets.
- **Thick Ink Borders**: Every interactive surface has a thick, 3px solid black border.
- **Punchy Color Blocks**: A highly saturated palette of **Blue** (`#3D5AFE`), **Red** (`#FF3B3B`), **Yellow** (`#FFD93D`), and **Orange** (`#FF7A00`) on a stark **Paper** (`#F5F1E8`) background.
- **Physical Interactions**: No slow gliding. Buttons possess physical "thump" spring animations (`stiffness: 400`, `damping: 17`) that instantly collapse their shadows when pressed.
- **Heavy Typography**: `Space Grotesk` headlines paired with utilitarian `Inter` body text.

---

## 🎮 Game Logic & Flow

### 1. The Splash Screen
Whether joining via a direct link or visiting the homepage, users are greeted with a fast-paced, 4-beat cinematic sticker-collage sequence.
> **Icon Pops -> Creator Chip Stamps -> Wellness Categories stagger in -> Loading Bar fills.**

### 2. The Lobby (Real-Time Multiplayer)
Players enter a specific Game Session ID to join the Lobby. 
- The Lobby displays 4 oversized Team Cards. 
- Using **Supabase WebSockets**, when one player selects a team, that team *instantly* locks for everyone else globally. The locked card desaturates, its border dashes, and a "Taken" stamp appears.

### 3. The Waiting Room
The hunt does not start until all 4 teams lock in. The app holds all players in a Waiting Room. Once the 4th player clicks their team, the server triggers a global event that instantly launches the Game Loop for everyone simultaneously.

### 4. The Game Loop
- **The Scanner**: A native HTML5 QR code scanner with thick target brackets requests direct camera access.
- **The Scan**: When a player scans a physical QR code (generated via Delphi), the app validates the hidden 6-digit PIN.
- **The Reveal**: If correct, the Clue Card physically flips 3D (`rotateY`). It reveals a **Wellness Fact** and an animated troll GIF. Two seconds later, the card slides up to reveal the next location's clue.

### 5. Victory Condition
The first team to scan their final QR code triggers the Global Game Over state. The winning team receives an oversized Confetti-filled Victory screen, while the losing teams are instantly interrupted with a global "Game Over! [Color] Team Won!" alert.

---

## 🛠️ Admin Dashboard

The Admin Workspace (`/admin`) is designed for gamemasters.
- **Session Management**: One-click creation of new Game Sessions (spawns the 4 team channels automatically).
- **Live Leaderboard**: Watch team progress in real-time.
- **Clue Generator**: Add sequential clues and wellness facts to specific teams. The app auto-generates a unique 6-digit `PIN` for each step.
- **Receipt Pins**: Pins are displayed in dashed "receipt" boxes. Click a receipt to copy the PIN instantly to generate your QR codes in Delphi.
- **Test Sandbox**: A specialized button to instantly generate a sandbox game with 1 winning clue to test functionality.

---

## 🚀 Deployment (Netlify Ready)

1. Push this repository to **GitHub**.
2. Log into **Netlify** -> Add New Site -> Import an existing project from GitHub.
3. Select your repository. Netlify will auto-detect Next.js and apply the `npm run build` command.
4. **CRITICAL**: Go to **Environment Variables** in Netlify and add:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your-anon-key`
5. Click **Deploy Site**.

> ⚠️ **IMPORTANT**: Because this app utilizes native HTML5 Camera Access (`navigator.mediaDevices`), modern browsers strictly require the site to be hosted over `HTTPS`. Netlify provides SSL/HTTPS automatically.

---

## 🗄️ Supabase Database Schema

To set this up on your own Supabase instance, run the following SQL script to create the tables, enable Realtime, and configure Security Policies:

```sql
-- 1. Game Sessions Table
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status TEXT DEFAULT 'active',
    winner_team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Teams Table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    color TEXT NOT NULL,
    is_selected BOOLEAN DEFAULT FALSE,
    current_clue_index INTEGER DEFAULT 0,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Clues Table
CREATE TABLE clues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    pin_code TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    wellness_fact TEXT NOT NULL
);

-- 4. Enable RLS (Public Access for Game)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE clues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read/write access for all users" ON game_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write access for all users" ON teams FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable read/write access for all users" ON clues FOR ALL USING (true) WITH CHECK (true);

-- 5. Enable Realtime Sync (CRITICAL)
ALTER PUBLICATION supabase_realtime ADD TABLE teams;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
```

---

<div align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Inter&size=16&pause=1000&color=0D0D0D&center=true&vCenter=true&width=400&lines=Made+by+ID7;Creative+Edge." alt="Typing SVG" />
</div>
