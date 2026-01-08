const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve static files (HTML, CSS, JS)

// Helper function to get device ID from request
function getDeviceIdFromRequest(req) {
    // Try header first, then query parameter
    return req.headers['x-device-id'] || req.query.deviceId || 'default';
}

// Ensure data directory exists
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
    } catch (error) {
        console.error('Error creating data directory:', error);
    }
}

// Data file paths
const TASKS_FILE = path.join(DATA_DIR, 'tasks.json');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const USER_PREFS_FILE = path.join(DATA_DIR, 'userPrefs.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// Helper function to read JSON file
async function readJSONFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') {
            return {};
        }
        throw error;
    }
}

// Helper function to write JSON file
async function writeJSONFile(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// ==================== TASKS API ====================

// Get all tasks for a device
app.get('/api/tasks', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(TASKS_FILE);
        const deviceTasks = allData[deviceId] || {};
        res.json(deviceTasks);
    } catch (error) {
        console.error('Error reading tasks:', error);
        res.status(500).json({ error: 'Failed to read tasks' });
    }
});

// Save all tasks for a device
app.post('/api/tasks', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const tasks = req.body;
        const allData = await readJSONFile(TASKS_FILE);
        allData[deviceId] = tasks;
        await writeJSONFile(TASKS_FILE, allData);
        res.json({ success: true, message: 'Tasks saved successfully' });
    } catch (error) {
        console.error('Error saving tasks:', error);
        res.status(500).json({ error: 'Failed to save tasks' });
    }
});

// Get tasks for a specific date for a device
app.get('/api/tasks/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(TASKS_FILE);
        const deviceTasks = allData[deviceId] || {};
        res.json(deviceTasks[date] || []);
    } catch (error) {
        console.error('Error reading tasks for date:', error);
        res.status(500).json({ error: 'Failed to read tasks' });
    }
});

// Add or update a task for a device
app.post('/api/tasks/:date', async (req, res) => {
    try {
        const { date } = req.params;
        const deviceId = getDeviceIdFromRequest(req);
        const task = req.body;
        
        if (!task.id) {
            task.id = Date.now();
        }
        
        const allData = await readJSONFile(TASKS_FILE);
        if (!allData[deviceId]) {
            allData[deviceId] = {};
        }
        const deviceTasks = allData[deviceId];
        
        if (!deviceTasks[date]) {
            deviceTasks[date] = [];
        }
        
        const existingIndex = deviceTasks[date].findIndex(t => t.id === task.id);
        if (existingIndex !== -1) {
            deviceTasks[date][existingIndex] = task;
        } else {
            deviceTasks[date].push(task);
        }
        
        // Sort tasks by start time
        deviceTasks[date].sort((a, b) => {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });
        
        await writeJSONFile(TASKS_FILE, allData);
        res.json({ success: true, task });
    } catch (error) {
        console.error('Error saving task:', error);
        res.status(500).json({ error: 'Failed to save task' });
    }
});

// Delete a task for a device
app.delete('/api/tasks/:date/:id', async (req, res) => {
    try {
        const { date, id } = req.params;
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(TASKS_FILE);
        
        if (allData[deviceId] && allData[deviceId][date]) {
            allData[deviceId][date] = allData[deviceId][date].filter(t => {
                const taskId = typeof t.id === 'string' ? parseInt(t.id, 10) : t.id;
                const deleteId = typeof id === 'string' ? parseInt(id, 10) : parseInt(id, 10);
                return taskId !== deleteId && t.id !== id;
            });
            if (allData[deviceId][date].length === 0) {
                delete allData[deviceId][date];
            }
            await writeJSONFile(TASKS_FILE, allData);
        }
        
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// ==================== NOTES API ====================

// Get all notes for a device
app.get('/api/notes', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(NOTES_FILE);
        const deviceNotes = allData[deviceId] || [];
        res.json(Array.isArray(deviceNotes) ? deviceNotes : []);
    } catch (error) {
        console.error('Error reading notes:', error);
        res.status(500).json({ error: 'Failed to read notes' });
    }
});

// Add or update a note for a device
app.post('/api/notes', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const note = req.body;
        const allData = await readJSONFile(NOTES_FILE);
        
        if (!allData[deviceId]) {
            allData[deviceId] = [];
        }
        let deviceNotes = allData[deviceId];
        
        if (!Array.isArray(deviceNotes)) {
            deviceNotes = [];
        }
        
        if (!note.id) {
            note.id = Date.now();
            note.createdAt = new Date().toISOString();
            deviceNotes.push(note);
        } else {
            const existingIndex = deviceNotes.findIndex(n => n.id === note.id);
            if (existingIndex !== -1) {
                deviceNotes[existingIndex] = note;
            } else {
                deviceNotes.push(note);
            }
        }
        
        // Sort notes by date and time
        deviceNotes.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
        
        allData[deviceId] = deviceNotes;
        await writeJSONFile(NOTES_FILE, allData);
        res.json({ success: true, note });
    } catch (error) {
        console.error('Error saving note:', error);
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Delete a note for a device
app.delete('/api/notes/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(NOTES_FILE);
        
        if (allData[deviceId] && Array.isArray(allData[deviceId])) {
            allData[deviceId] = allData[deviceId].filter(n => {
                const noteId = typeof n.id === 'string' ? parseInt(n.id, 10) : n.id;
                const deleteId = typeof id === 'string' ? parseInt(id, 10) : parseInt(id, 10);
                return noteId !== deleteId && n.id !== id;
            });
            await writeJSONFile(NOTES_FILE, allData);
        }
        
        res.json({ success: true, message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ error: 'Failed to delete note' });
    }
});

// ==================== USER PREFERENCES API ====================

// Get user preferences for a device
app.get('/api/preferences', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(USER_PREFS_FILE);
        const devicePrefs = allData[deviceId] || {};
        res.json(devicePrefs);
    } catch (error) {
        console.error('Error reading preferences:', error);
        res.status(500).json({ error: 'Failed to read preferences' });
    }
});

// Save user preferences for a device
app.post('/api/preferences', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const prefs = req.body;
        const allData = await readJSONFile(USER_PREFS_FILE);
        allData[deviceId] = prefs;
        await writeJSONFile(USER_PREFS_FILE, allData);
        res.json({ success: true, message: 'Preferences saved successfully' });
    } catch (error) {
        console.error('Error saving preferences:', error);
        res.status(500).json({ error: 'Failed to save preferences' });
    }
});

// ==================== PROJECTS API ====================

// Get all projects for a device
app.get('/api/projects', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(PROJECTS_FILE);
        const deviceProjects = allData[deviceId] || [];
        res.json(Array.isArray(deviceProjects) ? deviceProjects : []);
    } catch (error) {
        console.error('Error reading projects:', error);
        res.status(500).json({ error: 'Failed to read projects' });
    }
});

// Save all projects for a device
app.post('/api/projects', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const projects = req.body;
        const allData = await readJSONFile(PROJECTS_FILE);
        allData[deviceId] = Array.isArray(projects) ? projects : [];
        await writeJSONFile(PROJECTS_FILE, allData);
        res.json({ success: true, message: 'Projects saved successfully' });
    } catch (error) {
        console.error('Error saving projects:', error);
        res.status(500).json({ error: 'Failed to save projects' });
    }
});

// Get a specific project
app.get('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(PROJECTS_FILE);
        const deviceProjects = allData[deviceId] || [];
        const project = deviceProjects.find(p => p.id === parseInt(id) || p.id === id);
        if (project) {
            res.json(project);
        } else {
            res.status(404).json({ error: 'Project not found' });
        }
    } catch (error) {
        console.error('Error reading project:', error);
        res.status(500).json({ error: 'Failed to read project' });
    }
});

// Add or update a project
app.post('/api/projects/:id?', async (req, res) => {
    try {
        const deviceId = getDeviceIdFromRequest(req);
        const project = req.body;
        const allData = await readJSONFile(PROJECTS_FILE);
        
        if (!allData[deviceId]) {
            allData[deviceId] = [];
        }
        let deviceProjects = allData[deviceId];
        
        if (!Array.isArray(deviceProjects)) {
            deviceProjects = [];
        }
        
        if (!project.id) {
            project.id = Date.now();
            project.createdAt = new Date().toISOString();
            deviceProjects.push(project);
        } else {
            const existingIndex = deviceProjects.findIndex(p => p.id === project.id);
            if (existingIndex !== -1) {
                deviceProjects[existingIndex] = project;
            } else {
                deviceProjects.push(project);
            }
        }
        
        allData[deviceId] = deviceProjects;
        await writeJSONFile(PROJECTS_FILE, allData);
        res.json({ success: true, project });
    } catch (error) {
        console.error('Error saving project:', error);
        res.status(500).json({ error: 'Failed to save project' });
    }
});

// Delete a project
app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deviceId = getDeviceIdFromRequest(req);
        const allData = await readJSONFile(PROJECTS_FILE);
        
        if (allData[deviceId] && Array.isArray(allData[deviceId])) {
            allData[deviceId] = allData[deviceId].filter(p => {
                const projectId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                const deleteId = typeof id === 'string' ? parseInt(id, 10) : parseInt(id, 10);
                return projectId !== deleteId && p.id !== id;
            });
            await writeJSONFile(PROJECTS_FILE, allData);
        }
        
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Get local IP address
function getLocalIPAddress() {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            // Skip internal (loopback) and non-IPv4 addresses
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

// Start server
async function startServer() {
    await ensureDataDir();
    const HOST = '0.0.0.0'; // Listen on all network interfaces
    const localIP = getLocalIPAddress();
    
    app.listen(PORT, HOST, () => {
        console.log('\n========================================');
        console.log('🚀 Server is running!');
        console.log('========================================');
        console.log(`📱 Local access:    http://localhost:${PORT}`);
        console.log(`🌐 Network access:  http://${localIP}:${PORT}`);
        console.log(`🔌 API endpoints:   http://${localIP}:${PORT}/api`);
        console.log('========================================\n');
        console.log('💡 To access from other devices on your network:');
        console.log(`   Use: http://${localIP}:${PORT}`);
        console.log('========================================\n');
    });
}

startServer().catch(console.error);
