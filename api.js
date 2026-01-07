// API Configuration
const API_BASE_URL = window.location.origin; // Use same origin, or set to 'http://localhost:3000' if needed

// Get device ID
function getDeviceId() {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
        // Generate a unique device ID
        deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('deviceId', deviceId);
        console.log('Generated new device ID:', deviceId);
    }
    return deviceId;
}

// Helper function for API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    try {
        const deviceId = getDeviceId();
        const url = new URL(`${API_BASE_URL}/api${endpoint}`);
        url.searchParams.append('deviceId', deviceId);
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-Device-Id': deviceId, // Also send in header as backup
            },
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url.toString(), options);
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API call failed (${method} ${endpoint}):`, error);
        throw error;
    }
}

// Tasks API
const TasksAPI = {
    // Get all tasks
    async getAll() {
        return await apiCall('/tasks');
    },

    // Save all tasks (bulk update)
    async saveAll(tasks) {
        return await apiCall('/tasks', 'POST', tasks);
    },

    // Get tasks for a specific date
    async getByDate(date) {
        return await apiCall(`/tasks/${date}`);
    },

    // Add or update a task
    async save(date, task) {
        return await apiCall(`/tasks/${date}`, 'POST', task);
    },

    // Delete a task
    async delete(date, id) {
        return await apiCall(`/tasks/${date}/${id}`, 'DELETE');
    }
};

// Notes API
const NotesAPI = {
    // Get all notes
    async getAll() {
        return await apiCall('/notes');
    },

    // Add or update a note
    async save(note) {
        return await apiCall('/notes', 'POST', note);
    },

    // Delete a note
    async delete(id) {
        return await apiCall(`/notes/${id}`, 'DELETE');
    }
};

// Preferences API
const PreferencesAPI = {
    // Get user preferences
    async get() {
        return await apiCall('/preferences');
    },

    // Save user preferences
    async save(prefs) {
        return await apiCall('/preferences', 'POST', prefs);
    }
};

// Health check
async function checkServerHealth() {
    try {
        const response = await apiCall('/health');
        return response.status === 'ok';
    } catch (error) {
        console.warn('Server health check failed:', error);
        return false;
    }
}
