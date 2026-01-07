# To-Do List Backend API

This is the backend server for the To-Do List application.

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Server

### Production Mode:
```bash
npm start
```

### Development Mode (with auto-reload):
```bash
npm run dev
```

The server will start on `http://localhost:3000`

## Network Access

The server is configured to be accessible from any device on your local network.

### Accessing from Other Devices:

1. **Start the server** using `npm start` or `npm run dev`

2. **Note the network IP address** displayed in the console (e.g., `http://192.168.1.100:3000`)

3. **On other devices** (phones, tablets, other computers):
   - Make sure they are connected to the same Wi-Fi network
   - Open a web browser
   - Enter the network IP address shown in the console (e.g., `http://192.168.1.100:3000`)

### Example:
If the console shows:
```
🌐 Network access:  http://192.168.1.100:3000
```

Then on your phone/tablet, open:
```
http://192.168.1.100:3000
```

### Troubleshooting:

- **Can't access from other devices?**
  - Make sure all devices are on the same Wi-Fi network
  - Check your firewall settings - you may need to allow port 3000
  - Try accessing from the same device first using `localhost:3000` to verify the server is running

- **Firewall on Windows:**
  - Open Windows Defender Firewall
  - Click "Allow an app or feature through Windows Defender Firewall"
  - Add Node.js or allow port 3000

- **Firewall on Mac/Linux:**
  - You may need to allow incoming connections on port 3000

## API Endpoints

### Tasks

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:date` - Get tasks for a specific date
- `POST /api/tasks` - Save all tasks (bulk update)
- `POST /api/tasks/:date` - Add or update a task for a specific date
- `DELETE /api/tasks/:date/:id` - Delete a task

### Notes

- `GET /api/notes` - Get all notes
- `POST /api/notes` - Add or update a note
- `DELETE /api/notes/:id` - Delete a note

### User Preferences

- `GET /api/preferences` - Get user preferences
- `POST /api/preferences` - Save user preferences

### Health Check

- `GET /api/health` - Check if server is running

## Data Storage

Data is stored in JSON files in the `data/` directory:
- `data/tasks.json` - All tasks
- `data/notes.json` - All notes
- `data/userPrefs.json` - User preferences

## CORS

CORS is enabled to allow requests from the frontend.

## Notes

- The server also serves static files (HTML, CSS, JS) from the root directory
- All data is persisted to JSON files
- The server automatically creates the `data/` directory if it doesn't exist
