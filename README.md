# To-Do List App

A beautiful, modern to-do list application with a purple and white theme, featuring dashboard, timeline views, and task management.

## Features

- ✅ **Dashboard View**: Overview of your tasks with greeting and monthly summary
- ✅ **Timeline View**: Daily task view with date selector
- ✅ **Create Tasks**: Add tasks with title, date, start/end time, description, and category
- ✅ **Edit & Delete**: Click tasks to edit or delete them
- ✅ **Local Storage**: All tasks are saved locally in your browser
- ✅ **Progress Tracking**: View task counts and monthly summaries
- ✅ **Category Tags**: Organize tasks by category (Meeting, Marketing, Production, Dev, etc.)
- ✅ **Responsive Design**: Works on desktop and mobile devices

## Running Locally

### Option 1: Using Node.js (Recommended)

1. Install http-server globally (if not already installed):
   ```bash
   npm install -g http-server
   ```

2. Navigate to the project directory and run:
   ```bash
   http-server -p 8080 -a 0.0.0.0
   ```

3. Access the app:
   - **On your computer**: http://localhost:8080
   - **On other devices on your network**: http://YOUR_IP_ADDRESS:8080
     - To find your IP address, run: `ipconfig` (Windows) and look for "IPv4 Address"

### Option 2: Using npx (No installation needed)

Simply run:
```bash
npx http-server -p 8080 -a 0.0.0.0
```

### Option 3: Using Python (if installed)

```bash
python -m http.server 8080
```

### Option 4: Using VS Code Live Server Extension

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"
4. The page will open in your browser

### Option 5: Direct File Access (Local only)

Simply double-click `index.html` to open it in your browser. 
**Note**: This method only works on your computer and won't be accessible on your network.

## How to Use

1. **Dashboard**: View your greeting, monthly task count, and today's tasks
2. **Add Task**: Click "Add Task" button to create a new task
3. **Timeline**: Click "Calendar" in bottom navigation to view timeline
4. **Edit Task**: Click on any task card to edit it
5. **Delete Task**: Click the trash icon on any task to delete it
6. **Select Date**: Click on dates in the timeline view to see tasks for that day

## Design

- **Color Scheme**: Purple (#8B5CF6) and white theme
- **Modern UI**: Clean, rounded corners, smooth animations
- **Bottom Navigation**: Easy access to Home, Calendar, Notifications, and Search
- **Responsive**: Adapts to different screen sizes

## Browser Support

Works on all modern browsers (Chrome, Firefox, Safari, Edge).
