# ⚽ Console Football Manager

AI-powered football management game running entirely in your terminal with Vietnamese and English support.

## 🎮 Features

- **🧠 Smart AI Coach**: Automated tactical analysis, formation selection, and in-match decisions
- **🌍 Dual Language**: Full Vietnamese and English support
- **📊 Deep Simulation**: Realistic match simulation with detailed statistics
- **🏆 League Management**: Complete season simulation with league tables
- **💾 Save System**: Save and load your progress
- **🎯 Strategic Depth**: Formation counters, tactical adjustments, player roles

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- Terminal that supports colors (Windows Terminal, iTerm2, etc.)

### Steps

1. **Clone or Download the Project**
```bash
cd ~/console-football-manager
```

2. **Install Dependencies**
```bash
npm install
```

3. **Create Required Folders**
```bash
mkdir -p src/data/saves
mkdir -p src/data/schedules
```

4. **Add More Clubs** (Optional)
Copy `src/data/clubs/manchester_united.json` and modify for other clubs:
- `liverpool.json`
- `arsenal.json`
- `chelsea.json`
- etc.

Update `premier_league.json` clubs array with their IDs.

5. **Run the Game**
```bash
npm start
```

## 🎯 How to Play

### Starting a New Game

1. Launch the game with `npm start`
2. Select "New Game"
3. Choose your club (sorted by reputation)
4. AI Coach will automatically distribute players to all clubs
5. Season schedule is generated automatically

### Game Menu Options

- **⚽ Continue**: Play the next match
- **📊 League Table**: View current standings
- **👥 Squad**: View your squad and player ratings
- **💾 Save Game**: Save your progress
- **🏠 Main Menu**: Return to main menu

### During Matches

The AI Coach will:
- Analyze your opponent
- Select the best formation
- Choose starting XI based on form and fitness
- Make tactical decisions during the match
- Substitute tired players
- Adjust tactics based on score

You just watch and learn from the AI's decisions!

## 🗂️ Project Structure

```
console-football-manager/
├── index.js              # Entry point
├── package.json          # Dependencies
├── config.json           # Game configuration
│
├── src/
│   ├── core/             # Game logic
│   │   ├── GameEngine.js
│   │   ├── MatchSimulator.js
│   │   ├── ScheduleGenerator.js
│   │   └── PlayerDistributor.js
│   │
│   ├── ai/               # AI systems
│   │   ├── AICoach.js
│   │   └── InMatchAI.js
│   │
│   ├── ui/               # User interface
│   │   ├── MainMenu.js
│   │   └── LeagueTable.js
│   │
│   ├── utils/            # Utilities
│   │   ├── DataLoader.js
│   │   ├── Logger.js
│   │   └── Translator.js
│   │
│   └── data/
│       ├── leagues/      # League definitions
│       ├── clubs/        # Club data
│       ├── players/      # Player intakes
│       ├── translations/ # Language files
│       ├── saves/        # Save games
│       └── schedules/    # Generated schedules
```

## 🔧 Configuration

Edit `config.json` to customize:

```json
{
  "game": {
    "default_language": "vi"  // or "en"
  },
  "ai": {
    "difficulty": "medium",    // easy, medium, hard
    "tactical_flexibility": 75
  },
  "season": {
    "start_year": 2026,
    "leagues": ["premier_league"]
  }
}
```

## 📝 Adding More Data

### Add a New Club

Create `src/data/clubs/your_club.json`:

```json
{
  "club_id": "your_club",
  "name": "Your Club Name",
  "league": "premier_league",
  "reputation": { "global": 75 },
  "squad": {
    "current_players": [],
    "average_rating": 75
  },
  "tactics": {
    "default_formation": "4-4-2",
    "mentality": "balanced"
  }
}
```

Add to `premier_league.json` clubs array.

### Add More Players

Edit `src/data/players/2026_intake.json` and add players to the leagues.players array.

The PlayerDistributor will automatically assign them to clubs when you start a new game.

## 🎮 Gameplay Tips

1. **Choose Your Club Wisely**: Bigger clubs have better players but higher expectations
2. **Watch the AI**: Learn tactical decisions from the AI Coach
3. **Check League Table**: Monitor your position regularly
4. **Squad Management**: Keep an eye on player fitness and form

## 🐛 Troubleshooting

### "No clubs found" Error
- Make sure you have club JSON files in `src/data/clubs/`
- Check that `premier_league.json` lists the correct club IDs

### "Failed to load player intake" Error
- Ensure `2026_intake.json` exists in `src/data/players/`
- Check JSON syntax is valid

### Display Issues
- Use a modern terminal with color support
- On Windows, use Windows Terminal instead of CMD

## 🔮 Future Features

- [ ] Multiple leagues support
- [ ] Transfer market
- [ ] Player development system
- [ ] Cup competitions
- [ ] More detailed player attributes
- [ ] Injury system
- [ ] Contract management

## 📄 License

MIT License - Feel free to modify and distribute

## 🤝 Contributing

Feel free to:
- Add more clubs and players
- Improve AI tactics
- Add new features
- Fix bugs
- Add more languages

---

**Enjoy managing your team! ⚽🏆**
