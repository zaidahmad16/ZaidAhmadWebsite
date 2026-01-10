# Snake Game with Python Backend

## Setup & Run

1. **Install Flask** (already done):
   ```
   pip install flask
   ```

2. **Run the server**:
   ```
   python app.py
   ```

3. **Open your browser**:
   Go to `http://localhost:5000`

## How it Works

- **Backend (app.py)**: Python Flask server handles all game logic
  - `/api/game/start` - Creates new game
  - `/api/game/move` - Processes snake movement
  - Validates collisions on the server
  - Manages game state

- **Frontend (templates/index.html)**: JavaScript communicates with backend
  - Sends movement requests via API
  - Receives updated game state
  - Renders the snake game on canvas
  - Spells your name when game ends

## Features

✅ Server-side game logic (Python)
✅ RESTful API architecture
✅ Real-time state management
✅ Collision detection on backend
✅ Name spelling animation
