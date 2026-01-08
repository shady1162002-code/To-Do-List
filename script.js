// Data structure: { "YYYY-MM-DD": [{ id, title, description, startTime, endTime, date, category, completed }, ...], ... }
// Load tasks from API
let tasksByDay = {};
let currentView = 'dashboard';
let selectedDate = new Date().toISOString().split('T')[0];
let selectedCategory = 'Meeting';
let editingTaskId = null;
let currentTab = 'tasks'; // 'tasks', 'projects', 'notes'
let editingNoteId = null;
let useBackend = true; // Always use backend server

// Notes data structure: [{ id, title, content, date, time, createdAt }, ...]
let notes = [];

// Projects data structure: [{ id, name, description, startDate, endDate, priority, status, color, milestones, createdAt, tasks }, ...]
let projects = [];
let currentProjectView = 'grid'; // 'grid', 'kanban', 'analytics'
let editingProjectId = null;
let selectedProjectColor = '#8B5CF6';

// Device ID - unique identifier for each device/user
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

const deviceId = getDeviceId();

// Task Notification System
let shownNotifications = new Set();
let notificationInterval = null;

// Language support
let currentLang = localStorage.getItem('appLanguage') || 'en';

const translations = {
    en: {
        greeting: 'Hello',
        greetingMorning: 'Good Morning',
        greetingAfternoon: 'Good Afternoon',
        greetingEvening: 'Good Evening',
        haveNiceDay: 'Have a nice day!',
        myTasks: 'My tasks',
        project: 'Project',
        note: 'Note',
        uhave:'You have',
        tasksThisMonth: 'tasks this month',
        todayTasks: "Today's Tasks",
        addTask: 'Add Task',
        addProject: 'Add Project',
        createNewTask: 'Create New Task',
        title: 'Title',
        date: 'Date',
        startTime: 'Start time',
        endTime: 'End time',
        description: 'Description',
        category: 'Category',
        createTask: 'Create Task',
        task: 'Task',
        home: 'Home',
        calendar: 'Calendar',
        notifications: 'Projects',
        search: 'Notes',
        noTasksToday: 'No tasks for today. Click "Add Task" to create one!',
        noTasksDay: 'No tasks for this day. Click "Add Task" to create one!',
        today: 'Today',
        tomorrow: 'Tomorrow',
        yesterday: 'Yesterday',
        daysAgo: 'days ago',
        daysFromNow: 'days from now',
        meeting: 'Meeting',
        marketing: 'Marketing',
        production: 'Production',
        dev: 'Dev',
        dashboardDesign: 'Dashboard Design',
        uiDesign: 'UI Design',
        addNote: 'Add Note',
        createNote: 'Create Note',
        noteTitle: 'Note Title',
        noteContent: 'Note Content',
        alarmTime: 'Alarm Time',
        myNotes: 'My Notes',
        noNotes: 'No notes yet. Add your first note!',
        noteNotification: 'Note Reminder',
        noteAlarm: 'Note Alarm'
    },
    ar: {
        greeting: 'مرحبا',
        greetingMorning: 'صباح الخير',
        greetingAfternoon: 'مساء الخير',
        greetingEvening: 'مساء الخير',
        haveNiceDay: 'أتمنى لك يوماً سعيداً!',
        myTasks: 'مهامي',
        project: 'مشروع',
        note: 'ملاحظة',
        tasksThisMonth: 'مهمة هذا الشهر',
        uhave:'لديك',
        todayTasks: 'مهام اليوم',
        addTask: 'إضافة مهمة',
        addProject: 'إضافة مشروع',
        createNewTask: 'إنشاء مهمة جديدة',
        title: 'العنوان',
        date: 'التاريخ',
        startTime: 'وقت البداية',
        endTime: 'وقت النهاية',
        description: 'الوصف',
        category: 'الفئة',
        createTask: 'إنشاء المهمة',
        task: 'المهمة',
        home: 'الرئيسية',
        calendar: 'التقويم',
        notifications: 'المشاريع',
        search: 'الملاحظات',
        noTasksToday: 'لا توجد مهام لليوم. انقر على "إضافة مهمة" لإنشاء واحدة!',
        noTasksDay: 'لا توجد مهام لهذا اليوم. انقر على "إضافة مهمة" لإنشاء واحدة!',
        today: 'اليوم',
        tomorrow: 'غداً',
        yesterday: 'أمس',
        daysAgo: 'أيام مضت',
        daysFromNow: 'أيام من الآن',
        meeting: 'اجتماع',
        marketing: 'تسويق',
        production: 'إنتاج',
        dev: 'تطوير',
        dashboardDesign: 'تصميم لوحة التحكم',
        uiDesign: 'تصميم واجهة المستخدم',
        addNote: 'إضافة ملاحظة',
        createNote: 'إنشاء ملاحظة',
        noteTitle: 'عنوان الملاحظة',
        noteContent: 'محتوى الملاحظة',
        alarmTime: 'وقت التنبيه',
        myNotes: 'ملاحظاتي',
        noNotes: 'لا توجد ملاحظات بعد. أضف ملاحظتك الأولى!',
        noteNotification: 'تذكير الملاحظة',
        noteAlarm: 'تنبيه الملاحظة'
    }
};

// Clean up any old tasks that might be missing required fields
function cleanupOldTasks() {
    let needsSave = false;
    for (const date in tasksByDay) {
        tasksByDay[date] = tasksByDay[date].filter(task => {
            // Remove tasks without title
            if (!task.title) {
                needsSave = true;
                return false;
            }
            // Add default times if missing
            if (!task.startTime) {
                task.startTime = '09:00';
                needsSave = true;
            }
            if (!task.endTime) {
                task.endTime = '10:00';
                needsSave = true;
            }
            // Ensure completed field exists (for old tasks that might not have it)
            if (task.completed === undefined) {
                task.completed = false;
                needsSave = true;
            }
            return true;
        });
        
        // Remove empty date entries
        if (tasksByDay[date].length === 0) {
            delete tasksByDay[date];
            needsSave = true;
        }
    }
    
    if (needsSave) {
        saveTasks();
    }
}

// DOM Elements
let dashboardView, timelineView, projectsView, analyticsView, profileView, taskModal, taskForm;
let isDarkMode = localStorage.getItem('darkMode') === 'true' || false;
let todayTasks, taskList, dateSelector;
let viewTimelineBtn, backBtn, closeModal;
let addTaskBtnTimeline, navIcons;
let monthYearDisplay;
let bigCalendar, bigCalendarMonthYear, calendarPrevMonth, calendarNextMonth;
let calendarCurrentMonth = null;
let calendarCurrentYear = null;

// AI Assistant variables
let aiChatBtn, aiChatWindow, aiChatClose, aiChatInput, aiChatSend, aiChatMessages;
const GEMINI_API_KEY = 'AIzaSyCEEDfYa7n2as3X6ESk33-tJ23fydbdCZU';
// Use the latest Gemini 1.5 Flash model that supports generateContent on v1beta
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Initialize
// Main color functions
function getMainColor() {
    return localStorage.getItem('mainColor') || '#8B5CF6';
}

function setMainColor(color) {
    localStorage.setItem('mainColor', color);
    document.documentElement.style.setProperty('--primary-purple', color);
    // Update related colors
    const rgb = hexToRgb(color);
    if (rgb) {
        const lightColor = `rgb(${Math.min(255, rgb.r + 20)}, ${Math.min(255, rgb.g + 20)}, ${Math.min(255, rgb.b + 20)})`;
        const darkColor = `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`;
        document.documentElement.style.setProperty('--purple-light', lightColor);
        document.documentElement.style.setProperty('--purple-dark', darkColor);
    }
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Load main color from localStorage
    const savedColor = getMainColor();
    setMainColor(savedColor);
    
    initializeDOMElements();
    setupEventListeners();
    
    // Check if backend is available
    const serverHealthy = await checkServerHealth();
    if (!serverHealthy && useBackend) {
        console.warn('Backend server not available, falling back to localStorage');
        useBackend = false;
        // Load from localStorage as fallback
        await loadFromLocalStorage();
    }
    
    if (useBackend) {
        // Load data from API
        await loadDataFromAPI();
    }
    
    // Load preferences
    await loadPreferences();
    
    cleanupOldTasks(); // Clean up any old/invalid tasks
    setLanguage(currentLang); // Set initial language
    updateGreeting();
    renderDashboard();
    renderDateSelector();
    renderTimeline();
    updateMonthTaskCount();
    updateTodayProgress();
    updateDayProgress();
    renderNotes();
    
    // Initialize big calendar with current device month
    if (bigCalendar) {
        const today = new Date();
        calendarCurrentMonth = today.getMonth();
        calendarCurrentYear = today.getFullYear();
        renderBigCalendar();
    }
    
    // Restore view state if it was saved before refresh
    const savedViewState = sessionStorage.getItem('restoreView');
    if (savedViewState) {
        try {
            const viewState = JSON.parse(savedViewState);
            if (viewState.view) {
                currentView = viewState.view;
                if (viewState.selectedDate) {
                    selectedDate = viewState.selectedDate;
                }
                if (viewState.currentTab) {
                    currentTab = viewState.currentTab;
                }
                
                // Restore the view
                switchView(currentView);
                if (viewState.selectedDate) {
                    selectDate(viewState.selectedDate);
                }
                if (viewState.currentTab) {
                    switchTab(viewState.currentTab);
                }
            }
            // Clear the saved state after restoring
            sessionStorage.removeItem('restoreView');
        } catch (error) {
            console.error('Error restoring view state:', error);
        }
    }
    
    // Start notification checkers if they exist
    if (typeof startNotificationChecker === 'function') {
        startNotificationChecker();
    }
    if (typeof startNoteNotificationChecker === 'function') {
        startNoteNotificationChecker();
    }
    
    // Check for notes that should trigger notifications on page load
    checkNotesForNotificationsOnLoad();
}

// Load data from API
async function loadDataFromAPI() {
    try {
        // Load tasks
        const tasks = await TasksAPI.getAll();
        tasksByDay = tasks || {};
        
        // Ensure all tasks have completed field
        for (const date in tasksByDay) {
            tasksByDay[date] = tasksByDay[date].map(task => ({
                ...task,
                completed: task.completed !== undefined ? task.completed : false
            }));
        }
        
        // Load notes
        notes = await NotesAPI.getAll() || [];
        
        // Load projects
        projects = await ProjectsAPI.getAll() || [];
        
        // Normalize projects data - ensure tasks array exists and IDs are consistent
        projects = projects.map(project => ({
            ...project,
            tasks: Array.isArray(project.tasks) ? project.tasks : [],
            id: typeof project.id === 'string' ? parseInt(project.id, 10) : project.id
        }));
        
        console.log('Data loaded from API');
    } catch (error) {
        console.error('Error loading data from API:', error);
        // Fallback to localStorage
        await loadFromLocalStorage();
        useBackend = false;
    }
}

// Load data from localStorage (fallback)
async function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('tasksByDay');
        if (saved) {
            const parsed = JSON.parse(saved);
            for (const date in parsed) {
                parsed[date] = parsed[date].map(task => ({
                    ...task,
                    completed: task.completed !== undefined ? task.completed : false
                }));
            }
            tasksByDay = parsed;
        }
        
        const savedNotes = localStorage.getItem('notes');
        if (savedNotes) {
            notes = JSON.parse(savedNotes);
        }
        
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
            projects = JSON.parse(savedProjects);
            // Normalize projects data - ensure tasks array exists and IDs are consistent
            projects = projects.map(project => ({
                ...project,
                tasks: Array.isArray(project.tasks) ? project.tasks : [],
                id: typeof project.id === 'string' ? parseInt(project.id, 10) : project.id
            }));
        }
        
        console.log('Data loaded from localStorage');
    } catch (error) {
        console.error('Error loading from localStorage:', error);
    }
}

// Load preferences
async function loadPreferences() {
    try {
        if (useBackend) {
            const prefs = await PreferencesAPI.get();
            if (prefs && prefs.language) {
                currentLang = prefs.language;
            }
        } else {
            currentLang = localStorage.getItem('appLanguage') || 'en';
        }
    } catch (error) {
        console.error('Error loading preferences:', error);
        currentLang = localStorage.getItem('appLanguage') || 'en';
    }
}

function initializeDOMElements() {
    dashboardView = document.getElementById('dashboard-view');
    timelineView = document.getElementById('timeline-view');
    projectsView = document.getElementById('projects-view');
    analyticsView = document.getElementById('analytics-view');
    notesView = document.getElementById('notes-view');
    profileView = document.getElementById('profile-view');
    taskModal = document.getElementById('task-modal');
    taskForm = document.getElementById('task-form');
    todayTasks = document.getElementById('today-tasks');
    taskList = document.getElementById('task-list');
    dateSelector = document.getElementById('date-selector');
    backBtn = document.getElementById('back-btn');
    closeModal = document.getElementById('close-modal');
    addTaskBtnTimeline = document.getElementById('add-task-btn-timeline');
    monthYearDisplay = document.getElementById('month-year');
    navIcons = document.querySelectorAll('.nav-icon[data-view]');
    noteModal = document.getElementById('note-modal');
    noteForm = document.getElementById('note-form');
    notesList = document.getElementById('notes-list');
    
    // Big Calendar elements
    bigCalendar = document.getElementById('big-calendar');
    bigCalendarMonthYear = document.getElementById('big-calendar-month-year');
    calendarPrevMonth = document.getElementById('calendar-prev-month');
    calendarNextMonth = document.getElementById('calendar-next-month');
    
    // AI Assistant elements
    aiChatBtn = document.getElementById('ai-chat-btn');
    aiChatWindow = document.getElementById('ai-chat-window');
    aiChatClose = document.getElementById('ai-chat-close');
    aiChatInput = document.getElementById('ai-chat-input');
    aiChatSend = document.getElementById('ai-chat-send');
    aiChatMessages = document.getElementById('ai-chat-messages');
    addNoteBtn = document.getElementById('add-note-btn');
    navTabs = document.querySelectorAll('.nav-tab');
}

function setupEventListeners() {
    // Navigation
    navIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchView(view);
        });
    });

    // Back button
    if (backBtn) {
        backBtn.addEventListener('click', () => switchView('dashboard'));
    }

    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', closeTaskModal);
    }

    // Add task buttons
    if (addTaskBtnTimeline) {
        addTaskBtnTimeline.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add task button (timeline) clicked, selectedDate:', selectedDate);
            // Open modal with the currently selected date from calendar
            openTaskModal(selectedDate);
        });
    }
    
    // Dashboard add task button
    const addTaskBtnDashboard = document.getElementById('add-task-btn-dashboard');
    if (addTaskBtnDashboard) {
        addTaskBtnDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add task button (dashboard) clicked');
            openTaskModal();
        });
    } else {
        console.warn('Dashboard add task button not found');
    }

    // Task form
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }

    // Category tags
    document.querySelectorAll('.category-tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.category-tag').forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedCategory = e.currentTarget.dataset.category;
        });
    });

    // Close modal on outside click
    if (taskModal) {
        taskModal.addEventListener('click', (e) => {
            if (e.target === taskModal) {
                closeTaskModal();
            }
        });
    }

        // Set default category
        const firstCategory = document.querySelector('.category-tag');
        if (firstCategory) {
            firstCategory.classList.add('active');
            selectedCategory = firstCategory.dataset.category;
        }
        
        // Populate project dropdown when opening task modal
        const projectSelect = document.getElementById('task-project');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">No Project</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                projectSelect.appendChild(option);
            });
        }
    
    // Language toggle buttons
    const langToggleBtns = document.querySelectorAll('.lang-toggle-btn');
    langToggleBtns.forEach(btn => {
        btn.addEventListener('click', toggleLanguage);
    });

    // Tab switching
    navTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });

    // Note modal
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            openNoteModal();
        });
    }

    const closeNoteModalBtn = document.getElementById('close-note-modal');
    if (closeNoteModalBtn) {
        closeNoteModalBtn.addEventListener('click', closeNoteModal);
    }

    if (noteForm) {
        noteForm.addEventListener('submit', handleNoteSubmit);
    }

    if (noteModal) {
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) {
                closeNoteModal();
            }
        });
    }
    
    // AI Assistant event listeners
    if (aiChatBtn) {
        aiChatBtn.addEventListener('click', toggleAIChat);
    }
    
    if (aiChatClose) {
        aiChatClose.addEventListener('click', closeAIChat);
    }
    
    const aiChatDeleteHistory = document.getElementById('ai-chat-delete-history');
    if (aiChatDeleteHistory) {
        aiChatDeleteHistory.addEventListener('click', deleteChatHistory);
    }
    
    if (aiChatSend) {
        aiChatSend.addEventListener('click', sendAIMessage);
    }
    
    if (aiChatInput) {
        aiChatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendAIMessage();
            }
        });
    }
    
    // Initialize AI chat with welcome message
    initializeAIChat();
    
    // Big Calendar event listeners
    if (calendarPrevMonth) {
        calendarPrevMonth.addEventListener('click', () => {
            calendarCurrentMonth--;
            if (calendarCurrentMonth < 0) {
                calendarCurrentMonth = 11;
                calendarCurrentYear--;
            }
            renderBigCalendar();
        });
    }
    
    if (calendarNextMonth) {
        calendarNextMonth.addEventListener('click', () => {
            calendarCurrentMonth++;
            if (calendarCurrentMonth > 11) {
                calendarCurrentMonth = 0;
                calendarCurrentYear++;
            }
            renderBigCalendar();
        });
    }
    
    // Initialize calendar - set to current month/year
    if (calendarCurrentMonth === null || calendarCurrentYear === null) {
        const today = new Date();
        calendarCurrentMonth = today.getMonth();
        calendarCurrentYear = today.getFullYear();
    }
    if (bigCalendar) {
        renderBigCalendar();
    }
    
    // Add window resize listener to update date selector height on desktop
    window.addEventListener('resize', updateDateSelectorHeight);
    
    // Initialize dark mode
    initializeDarkMode();
    
    // Project modal - Add Project button
    setupProjectButton();
    
    const closeProjectModalBtn = document.getElementById('close-project-modal');
    if (closeProjectModalBtn) {
        closeProjectModalBtn.addEventListener('click', closeProjectModal);
    }
    
    const projectForm = document.getElementById('project-form');
    if (projectForm) {
        projectForm.addEventListener('submit', handleProjectSubmit);
    }
    
    const projectModal = document.getElementById('project-modal');
    if (projectModal) {
        projectModal.addEventListener('click', (e) => {
            if (e.target === projectModal) {
                closeProjectModal();
            }
        });
    }
    
    // Project view controls
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchProjectView(view);
        });
    });
    
    // Color picker
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', (e) => {
            document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            selectedProjectColor = e.currentTarget.dataset.color;
        });
    });
    
    // Add task button for projects
    const addProjectTaskBtn = document.getElementById('add-project-task-btn');
    if (addProjectTaskBtn) {
        addProjectTaskBtn.addEventListener('click', addProjectTask);
    }
}

// Setup Add Project button (separate function to call when switching tabs)
function setupProjectButton() {
    const addProjectBtn = document.getElementById('add-project-btn');
    if (addProjectBtn) {
        // Check if listener already attached (using data attribute as marker)
        if (addProjectBtn.dataset.listenerAttached === 'true') {
            // Listener already attached, just return
            return;
        }
        
        // Mark that listener is attached
        addProjectBtn.dataset.listenerAttached = 'true';
        
        // Add event listener
        addProjectBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Add Project button clicked');
            openProjectModal();
        });
        console.log('Add Project button event listener attached');
    } else {
        console.warn('Add Project button not found');
    }
}

// Language Functions
function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ar' : 'en';
    localStorage.setItem('appLanguage', currentLang);
    setLanguage(currentLang);
}

function setLanguage(lang) {
    currentLang = lang;
    const t = translations[lang];
    
    // Set HTML lang and dir attributes
    const htmlRoot = document.getElementById('html-root') || document.documentElement;
    htmlRoot.lang = lang;
    document.body.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update language toggle buttons
    document.querySelectorAll('.lang-toggle-btn span').forEach(span => {
        span.textContent = lang === 'en' ? 'AR' : 'EN';
    });
    
    // Re-render views if they're active
    if (currentView === 'analytics') {
        renderAnalyticsView();
    } else if (currentView === 'profile') {
        renderProfileView();
    }
    
    // Update navigation tabs
    const navTabs = document.querySelectorAll('.nav-tab');
    if (navTabs.length >= 3) {
        navTabs[0].textContent = t.myTasks;
        navTabs[1].textContent = t.project;
        navTabs[2].textContent = t.note;
    }
    
    // Update section headers
    const todayTasksHeader = document.querySelector('#dashboard-view .section-header h3');
    if (todayTasksHeader) todayTasksHeader.textContent = t.todayTasks;
    
    const taskListHeader = document.querySelector('#timeline-view .task-list-header h3');
    if (taskListHeader) taskListHeader.textContent = t.task;
    
    // Update modal title
    const modalTitle = document.querySelector('.modal-title h2');
    if (modalTitle) modalTitle.textContent = t.createNewTask;
    
    // Update form labels
    const titleLabel = document.querySelector('label[for="task-title"]') || document.querySelector('#task-title').previousElementSibling;
    if (titleLabel && titleLabel.tagName === 'LABEL') titleLabel.textContent = t.title;
    
    const dateLabel = document.querySelector('label[for="task-date"]') || document.querySelector('#task-date').previousElementSibling;
    if (dateLabel && dateLabel.tagName === 'LABEL') dateLabel.textContent = t.date;
    
    const startTimeLabel = document.querySelector('label[for="task-start-time"]') || document.querySelector('#task-start-time').parentElement.querySelector('label');
    if (startTimeLabel) startTimeLabel.textContent = t.startTime;
    
    const endTimeLabel = document.querySelector('label[for="task-end-time"]') || document.querySelector('#task-end-time').parentElement.querySelector('label');
    if (endTimeLabel) endTimeLabel.textContent = t.endTime;
    
    const descLabel = document.querySelector('label[for="task-description"]') || document.querySelector('#task-description').previousElementSibling;
    if (descLabel && descLabel.tagName === 'LABEL') descLabel.textContent = t.description;
    
    const categoryLabel = document.querySelector('#task-description').parentElement.nextElementSibling?.querySelector('label');
    if (categoryLabel) categoryLabel.textContent = t.category;
    
    // Update buttons
    const addTaskBtns = document.querySelectorAll('.add-task-btn-header');
    addTaskBtns.forEach(btn => {
        const icon = btn.querySelector('i');
        // Check if this is the note button (in notes view)
        if (btn.id === 'add-note-btn' || btn.id === 'add-note-btn-notes-view') {
            btn.innerHTML = icon ? `<i class="${icon.className}"></i> ${t.addNote}` : t.addNote;
        } else if (btn.id === 'add-project-btn' || btn.id === 'add-project-btn-standalone') {
            // Store listener attached state
            const listenerAttached = btn.dataset.listenerAttached === 'true';
            btn.innerHTML = icon ? `<i class="${icon.className}"></i> ${t.addProject}` : t.addProject;
            // Restore listener attached marker
            if (listenerAttached) {
                btn.dataset.listenerAttached = 'true';
            } else {
                // Re-attach event listener if not already attached
                setTimeout(() => setupProjectButton(), 0);
            }
        } else {
            btn.innerHTML = icon ? `<i class="${icon.className}"></i> ${t.addTask}` : t.addTask;
        }
    });
    
    const createTaskBtn = document.querySelector('.create-task-btn');
    if (createTaskBtn) createTaskBtn.textContent = t.createTask;
    
    // Update bottom navigation - update all navigation bars
    const navLabels = document.querySelectorAll('.nav-icon span');
    navLabels.forEach((label, index) => {
        if (index % 4 === 0) label.textContent = t.home;
        else if (index % 4 === 1) label.textContent = t.calendar;
        else if (index % 4 === 2) label.textContent = t.notifications;
        else if (index % 4 === 3) label.textContent = t.search;
    });
    
    // Update category tags
    const categoryTags = document.querySelectorAll('.category-tag');
    if (categoryTags.length >= 6) {
        categoryTags[0].textContent = t.meeting;
        categoryTags[1].textContent = t.marketing;
        categoryTags[2].textContent = t.production;
        categoryTags[3].textContent = t.dev;
        categoryTags[4].textContent = t.dashboardDesign;
        categoryTags[5].textContent = t.uiDesign;
    }
    
    // Re-render content
    updateGreeting();
    renderDashboard();
    renderDateSelector();
    renderTimeline();
    updateMonthTaskCount();
    updateTodayProgress();
    updateDayProgress();
}

// View Switching
function switchView(view) {
    currentView = view;
    
    // Handle profile as slide window separately
    if (view === 'profile') {
        openProfileSlide();
        return;
    } else {
        closeProfileSlide();
    }
    
    dashboardView.classList.toggle('active', view === 'dashboard');
    timelineView.classList.toggle('active', view === 'timeline');
    if (projectsView) projectsView.classList.toggle('active', view === 'projects');
    if (analyticsView) analyticsView.classList.toggle('active', view === 'analytics');
    if (notesView) notesView.classList.toggle('active', view === 'notes');
    
    // Update nav icons in all views (don't mark profile as active since it's a slide)
    const allNavIcons = document.querySelectorAll('.nav-icon[data-view]');
    allNavIcons.forEach(icon => {
        if (icon.dataset.view !== 'profile') {
            icon.classList.toggle('active', icon.dataset.view === view);
        } else {
            icon.classList.remove('active');
        }
    });
    
    if (view === 'timeline') {
        renderDateSelector();
        renderTimeline();
        updateMonthYear();
        if (bigCalendar) {
            renderBigCalendar();
        }
        // Update date selector height on desktop
        updateDateSelectorHeight();
    } else if (view === 'dashboard') {
        renderDashboard();
    } else if (view === 'projects') {
        renderProjectsView();
    } else if (view === 'analytics') {
        renderAnalyticsView();
    } else if (view === 'notes') {
        renderNotesView();
    }
}

// Open profile sidebar
function openProfileSlide() {
    if (!profileView) return;
    profileView.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    renderProfileView();
}

// Close profile sidebar
function closeProfileSlide() {
    if (!profileView) return;
    profileView.classList.remove('active');
    document.body.style.overflow = ''; // Restore scrolling
}

// Greeting
function updateGreeting() {
    const t = translations[currentLang];
    const hour = new Date().getHours();
    let greeting = t.greeting;
    if (hour >= 5 && hour < 12) greeting = t.greetingMorning;
    else if (hour >= 12 && hour < 17) greeting = t.greetingAfternoon;
    else if (hour >= 17) greeting = t.greetingEvening;
    
    const userName = localStorage.getItem('userName') || (currentLang === 'ar' ? 'المستخدم' : 'User');
    const greetingEl = document.getElementById('greeting-text');
    const haveNiceDayEl = document.querySelector('.greeting p');
    
    if (greetingEl) {
        // Check if username element already exists to preserve editing state
        const existingUserNameEl = greetingEl.querySelector('.editable-username');
        const currentUserName = existingUserNameEl ? existingUserNameEl.textContent.trim() : userName;
        
        greetingEl.innerHTML = `${greeting}, <span class="editable-username" contenteditable="true" title="${currentLang === 'ar' ? 'انقر للتعديل' : 'Click to edit'}">${currentUserName}</span>!`;
        
        // Add event listener for username editing
        const userNameEl = greetingEl.querySelector('.editable-username');
        if (userNameEl) {
            // Remove existing listeners to prevent duplicates
            const newUserNameEl = userNameEl.cloneNode(true);
            userNameEl.parentNode.replaceChild(newUserNameEl, userNameEl);
            
            // Save on blur (when user clicks away)
            newUserNameEl.addEventListener('blur', function() {
                const newName = this.textContent.trim();
                if (newName) {
                    localStorage.setItem('userName', newName);
                } else {
                    // Restore default if empty
                    const defaultName = currentLang === 'ar' ? 'المستخدم' : 'User';
                    this.textContent = defaultName;
                    localStorage.setItem('userName', defaultName);
                }
            });
            
            // Save on Enter key
            newUserNameEl.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.blur(); // This will trigger the blur event and save
                }
            });
        }
    }
    if (haveNiceDayEl) {
        haveNiceDayEl.textContent = t.haveNiceDay;
    }
}

// Save tasks (to API or localStorage)
async function saveTasks() {
    try {
        if (useBackend) {
            await TasksAPI.saveAll(tasksByDay);
            console.log('Tasks saved to API');
        } else {
            localStorage.setItem('tasksByDay', JSON.stringify(tasksByDay));
            console.log('Tasks saved to localStorage');
        }
    } catch (error) {
        console.error('Error saving tasks:', error);
        // Fallback to localStorage if API fails
        if (useBackend) {
            try {
                localStorage.setItem('tasksByDay', JSON.stringify(tasksByDay));
                console.log('Tasks saved to localStorage as fallback');
            } catch (localError) {
                if (localError.name === 'QuotaExceededError') {
                    alert('Storage is full. Please clear some old tasks to save your progress.');
                }
            }
        } else {
            if (error.name === 'QuotaExceededError') {
                alert('Storage is full. Please clear some old tasks to save your progress.');
            }
        }
    }
}

// Task Management
let isSubmittingTask = false;

async function addTask(taskData) {
    // Prevent duplicate submissions
    if (isSubmittingTask) {
        console.log('Task submission already in progress, ignoring duplicate call');
        return;
    }
    
    isSubmittingTask = true;
    console.log('addTask called with:', taskData);
    
    try {
        const { date, title, description, startTime, endTime, category, projectId } = taskData;
        
        if (!date || !title) {
            console.error('Missing required fields:', { date, title });
            alert('Please fill in all required fields');
            isSubmittingTask = false;
            return;
        }
        
        if (!tasksByDay[date]) {
            tasksByDay[date] = [];
        }
        
        // Validate startTime and endTime
        if (!startTime || !endTime) {
            console.error('Missing time fields:', { startTime, endTime });
            alert('Please fill in both start time and end time');
            isSubmittingTask = false;
            return;
        }
        
        // Check if task with same ID already exists (prevent duplicates)
        const newTaskId = editingTaskId || Date.now();
        const existingTask = Object.values(tasksByDay).flat().find(t => 
            !editingTaskId && t.id === newTaskId && t.title === title.trim() && t.date === date
        );
        
        if (existingTask) {
            console.log('Task already exists, skipping duplicate');
            isSubmittingTask = false;
            return;
        }
        
        // Find old task if editing to get the old projectId
        let oldTask = null;
        let oldProjectId = null;
        if (editingTaskId) {
            for (const day in tasksByDay) {
                const foundTask = tasksByDay[day].find(t => t.id === editingTaskId);
                if (foundTask) {
                    oldTask = foundTask;
                    oldProjectId = foundTask.projectId || null;
                    break;
                }
            }
        }
        
        const task = {
            id: newTaskId,
            title: title.trim(),
            description: (description || '').trim(),
            startTime: startTime || '09:00',
            endTime: endTime || '10:00',
            category: category || selectedCategory,
            projectId: projectId || null,
            completed: oldTask ? (oldTask.completed || false) : false // Preserve completion status when editing
        };
        
        // Handle project linking/unlinking
        // Normalize IDs for comparison
        const normalizedTaskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
        const normalizedOldProjectId = oldProjectId ? (typeof oldProjectId === 'string' ? parseInt(oldProjectId, 10) : oldProjectId) : null;
        const normalizedNewProjectId = task.projectId ? (typeof task.projectId === 'string' ? parseInt(task.projectId, 10) : task.projectId) : null;
        
        // If editing and project changed, update project links
        if (editingTaskId && normalizedOldProjectId !== normalizedNewProjectId) {
            // Remove from old project
            if (normalizedOldProjectId) {
                const oldProject = projects.find(p => {
                    const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                    return pId === normalizedOldProjectId || p.id === oldProjectId;
                });
                if (oldProject) {
                    if (!oldProject.tasks) oldProject.tasks = [];
                    oldProject.tasks = oldProject.tasks.filter(t => {
                        const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                        return refTaskId !== normalizedTaskId && t.taskId !== task.id;
                    });
                    await saveProjects();
                }
            }
            // Add to new project
            if (normalizedNewProjectId) {
                const project = projects.find(p => {
                    const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                    return pId === normalizedNewProjectId || p.id === task.projectId;
                });
                if (project) {
                    if (!project.tasks) project.tasks = [];
                    const taskExists = project.tasks.some(t => {
                        const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                        return refTaskId === normalizedTaskId || t.taskId === task.id;
                    });
                    if (!taskExists) {
                        project.tasks.push({ taskId: task.id, date: date });
                        await saveProjects();
                    }
                }
            }
        } else if (!editingTaskId && normalizedNewProjectId) {
            // New task - link to project
            const project = projects.find(p => {
                const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                return pId === normalizedNewProjectId || p.id === task.projectId;
            });
            if (project) {
                if (!project.tasks) project.tasks = [];
                const taskExists = project.tasks.some(t => {
                    const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                    return refTaskId === normalizedTaskId || t.taskId === task.id;
                });
                if (!taskExists) {
                    project.tasks.push({ taskId: task.id, date: date });
                    await saveProjects();
                }
            }
        }
        
        console.log('Created task object:', task);
        
        if (editingTaskId) {
            // Find and update task
            let found = false;
            for (const day in tasksByDay) {
                const index = tasksByDay[day].findIndex(t => t.id === editingTaskId);
                if (index !== -1) {
                    if (day !== date) {
                        tasksByDay[day].splice(index, 1);
                        if (tasksByDay[day].length === 0) {
                            delete tasksByDay[day];
                        }
                        tasksByDay[date].push(task);
                    } else {
                        tasksByDay[day][index] = task;
                    }
                    found = true;
                    break;
                }
            }
            editingTaskId = null;
        } else {
            tasksByDay[date].push(task);
            console.log('Task added to date:', date, 'Tasks now:', tasksByDay[date]);
        }
        
        // Sort tasks by start time (safely handle undefined/null values)
        tasksByDay[date].sort((a, b) => {
            const timeA = a.startTime || '00:00';
            const timeB = b.startTime || '00:00';
            return timeA.localeCompare(timeB);
        });
        
        // Save to backend server
        await saveTasks();
        console.log('Tasks saved to server');
        
        // Close modal
        closeTaskModal();
        
        // Refresh the page to update UI
        setTimeout(() => {
            window.location.reload();
        }, 500);
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Error adding task: ' + error.message);
        isSubmittingTask = false;
    }
}

async function deleteTask(date, id) {
    if (tasksByDay[date]) {
        // Normalize IDs for comparison
        const normalizedTaskId = typeof id === 'string' ? parseInt(id, 10) : id;
        
        // Find the task to get its projectId before deleting
        const taskToDelete = tasksByDay[date].find(task => {
            const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
            return taskId === normalizedTaskId || task.id === id;
        });
        
        // Remove task from project if it's linked
        if (taskToDelete && taskToDelete.projectId) {
            const projectId = typeof taskToDelete.projectId === 'string' ? parseInt(taskToDelete.projectId, 10) : taskToDelete.projectId;
            const project = projects.find(p => {
                const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                return pId === projectId || p.id === taskToDelete.projectId;
            });
            if (project) {
                if (!project.tasks) project.tasks = [];
                project.tasks = project.tasks.filter(t => {
                    const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                    return refTaskId !== normalizedTaskId && t.taskId !== id;
                });
                await saveProjects();
            }
        }
        
        tasksByDay[date] = tasksByDay[date].filter(task => {
            const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
            return taskId !== normalizedTaskId && task.id !== id;
        });
        if (tasksByDay[date].length === 0) {
            delete tasksByDay[date];
        }
        // Save to backend server
        await saveTasks();
        // Refresh the page to update UI
        window.location.reload();
    }
}

async function toggleTaskCompleted(date, id) {
    try {
        console.log('toggleTaskCompleted called', { date, id, tasksByDay: tasksByDay[date] });
        
        if (!tasksByDay[date]) {
            console.error('No tasks found for date:', date);
            return;
        }
        
        // Convert id to number if it's a string (for comparison)
        const taskId = typeof id === 'string' ? parseInt(id, 10) : id;
        
        // Find the task first to verify it exists
        const taskIndex = tasksByDay[date].findIndex(task => {
            const taskIdNum = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
            return taskIdNum === taskId || task.id === id;
        });
        
        if (taskIndex === -1) {
            console.error('Task not found:', { id, taskId, tasks: tasksByDay[date] });
            alert('Task not found. Please refresh the page.');
            return;
        }
        
        // Update task completed status
        const task = tasksByDay[date][taskIndex];
        task.completed = !task.completed;
        console.log('Task completion toggled:', { taskId: task.id, completed: task.completed });
        
        // Remove notification if task is completed
        if (task.completed && typeof shownNotifications !== 'undefined') {
            const notificationId = `task-${task.id}-${date}`;
            shownNotifications.delete(notificationId);
            shownNotifications.delete(`urgent-${notificationId}`);
        }
        
        // Save tasks to backend server (async) - ensure it completes
        try {
            await saveTasks();
            console.log('Tasks saved successfully');
        } catch (saveError) {
            console.error('Error saving tasks, but continuing with refresh:', saveError);
            // Still refresh even if save fails - data is already updated in memory
        }
        
        // Save current view state before refreshing
        try {
            sessionStorage.setItem('restoreView', JSON.stringify({
                view: currentView,
                selectedDate: selectedDate,
                currentTab: currentTab
            }));
        } catch (storageError) {
            console.warn('Could not save view state:', storageError);
        }
        
        // Refresh the page to update UI - use setTimeout to ensure all async operations complete
        console.log('Refreshing page...');
        setTimeout(() => {
            window.location.reload();
        }, 100);
    } catch (error) {
        console.error('Error in toggleTaskCompleted:', error);
        alert('Error updating task: ' + error.message);
    }
}

// Modal Functions
function openTaskModal(date = null, task = null) {
    console.log('openTaskModal called', { date, task, taskModal });
    
    if (!taskModal) {
        console.error('Task modal not found!');
        alert('Modal not found. Please refresh the page.');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const taskDate = date || (task ? Object.keys(tasksByDay).find(d => 
            tasksByDay[d].some(t => t.id === task.id)
        ) : null) || today;
        
        // Get form elements
        const titleInput = document.getElementById('task-title');
        const dateInput = document.getElementById('task-date');
        const startTimeInput = document.getElementById('task-start-time');
        const endTimeInput = document.getElementById('task-end-time');
        const descInput = document.getElementById('task-description');
        
        if (!titleInput || !dateInput || !startTimeInput || !endTimeInput) {
            console.error('Form inputs not found!');
            return;
        }
        
        // Set form values
        titleInput.value = task?.title || '';
        dateInput.value = taskDate;
        startTimeInput.value = task?.startTime || '09:00';
        endTimeInput.value = task?.endTime || '10:00';
        if (descInput) descInput.value = task?.description || '';
        
        // Set category
        if (task) {
            selectedCategory = task.category || 'Meeting';
            document.querySelectorAll('.category-tag').forEach(tag => {
                tag.classList.toggle('active', tag.dataset.category === selectedCategory);
            });
        }
        
        // Populate project dropdown
        const projectSelect = document.getElementById('task-project');
        if (projectSelect) {
            projectSelect.innerHTML = '<option value="">No Project</option>';
            projects.forEach(project => {
                const option = document.createElement('option');
                option.value = project.id;
                option.textContent = project.name;
                if (task && task.projectId) {
                    const taskProjectId = typeof task.projectId === 'string' ? parseInt(task.projectId, 10) : task.projectId;
                    const projectId = typeof project.id === 'string' ? parseInt(project.id, 10) : project.id;
                    if (taskProjectId === projectId || task.projectId === project.id) {
                        option.selected = true;
                    }
                }
                projectSelect.appendChild(option);
            });
        }
        
        editingTaskId = task?.id || null;
        
        // Show modal
        console.log('Showing modal');
        taskModal.classList.add('active');
        taskModal.style.display = 'block';
        console.log('Modal should be visible now');
    } catch (error) {
        console.error('Error opening modal:', error);
        alert('Error opening modal: ' + error.message);
    }
}

function closeTaskModal() {
    if (taskModal) {
        taskModal.classList.remove('active');
        taskModal.style.display = 'none';
    }
    if (taskForm) {
        taskForm.reset();
    }
    editingTaskId = null;
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    console.log('Form submitted!');
    
    const submitBtn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('.create-task-btn');
    if (submitBtn && submitBtn.disabled) {
        return; // Already submitting, prevent duplicate
    }
    
    const dateInput = document.getElementById('task-date');
    const titleInput = document.getElementById('task-title');
    const descInput = document.getElementById('task-description');
    const startTimeInput = document.getElementById('task-start-time');
    const endTimeInput = document.getElementById('task-end-time');
    
    if (!dateInput || !titleInput || !startTimeInput || !endTimeInput) {
        console.error('Required form inputs not found!');
        alert('Form error. Please refresh the page.');
        return;
    }
    
    const date = dateInput.value;
    const title = titleInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const projectSelect = document.getElementById('task-project');
    const projectId = projectSelect && projectSelect.value ? parseInt(projectSelect.value) : null;
    
    if (!title) {
        alert('Please enter a task title');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    if (!startTime) {
        alert('Please select a start time');
        return;
    }
    
    if (!endTime) {
        alert('Please select an end time');
        return;
    }
    
    // Show loading state
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
        
        // Disable form inputs
        const formInputs = e.target.querySelectorAll('input, select, textarea, button');
        formInputs.forEach(input => {
            if (input !== submitBtn) input.disabled = true;
        });
        
        try {
            console.log('Adding task:', { date, title, description, startTime, endTime, category: selectedCategory, projectId });
            await addTask({ date, title, description, startTime, endTime, category: selectedCategory, projectId });
        } catch (error) {
            // Restore button on error
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            formInputs.forEach(input => {
                if (input !== submitBtn) input.disabled = false;
            });
        }
    } else {
        await addTask({ date, title, description, startTime, endTime, category: selectedCategory, projectId });
    }
}

// Render Functions
function renderDashboard() {
    const t = translations[currentLang];
    const today = new Date().toISOString().split('T')[0];
    const todayTasksList = tasksByDay[today] || [];
    
    if (todayTasksList.length === 0) {
        todayTasks.innerHTML = `<div class="empty-state">${t.noTasksToday}</div>`;
        return;
    }
    
    todayTasks.innerHTML = todayTasksList.map(task => createTaskCard(task, today)).join('');
}

function createTaskCard(task, date) {
    const t = translations[currentLang];
    const timeRange = `${formatTime(task.startTime)} - ${formatTime(task.endTime)}`;
    const relativeDate = getRelativeDate(date);
    const completedClass = task.completed ? 'completed' : '';
    const checkIcon = task.completed ? 'fa-check-circle' : 'fa-circle';
    
    // Get project name if task is linked to a project
    let projectBadge = '';
    if (task.projectId) {
        const taskProjectId = typeof task.projectId === 'string' ? parseInt(task.projectId, 10) : task.projectId;
        const project = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
            return pId === taskProjectId || p.id === task.projectId;
        });
        if (project) {
            projectBadge = `<div class="task-project-badge" style="background: ${project.color || '#8B5CF6'};">
                <i class="fas fa-folder"></i> ${escapeHtml(project.name)}
            </div>`;
        }
    }
    
    return `
        <div class="task-card ${completedClass}">
            <button class="complete-task-btn" onclick="toggleTaskCompleted('${date}', ${task.id})" title="${task.completed ? (currentLang === 'ar' ? 'إلغاء الإكمال' : 'Mark as incomplete') : (currentLang === 'ar' ? 'تمييز كمكتمل' : 'Mark as complete')}">
                <i class="fas ${checkIcon}"></i>
            </button>
            <div class="task-icon">
                <i class="fas fa-tasks"></i>
            </div>
            <div class="task-info">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-date">${timeRange} • ${relativeDate}</div>
                ${projectBadge}
            </div>
            <div class="task-actions">
                <button class="edit-task-btn" onclick="event.stopPropagation(); editTask('${date}', ${task.id})" title="${currentLang === 'ar' ? 'تعديل' : 'Edit'}">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="delete-task-btn" onclick="event.stopPropagation(); deleteTask('${date}', ${task.id})" title="${currentLang === 'ar' ? 'حذف' : 'Delete'}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function renderDateSelector() {
    // Use selectedDate as the center point instead of today
    // Parse date string to avoid timezone issues
    const [year, month, day] = selectedDate.split('-').map(Number);
    const centerDate = new Date(year, month - 1, day);
    const dates = [];
    
    // Generate dates from -3 to +3 days around the selected date
    for (let i = -3; i <= 3; i++) {
        const date = new Date(centerDate);
        date.setDate(centerDate.getDate() + i);
        dates.push(date);
    }
    
    const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    dateSelector.innerHTML = dates.map(date => {
        // Format date string consistently to avoid timezone issues
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
        const dayNumber = date.getDate();
        const isActive = dateStr === selectedDate;
        
        // Calculate progress for this date
        const tasks = tasksByDay[dateStr] || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter(task => task.completed).length;
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return `
            <div class="date-item ${isActive ? 'active' : ''}" onclick="selectDate('${dateStr}')" data-date="${dateStr}">
                <div class="date-day">${dayName}</div>
                <div class="date-number">${dayNumber}</div>
                ${totalTasks > 0 ? `<div class="date-progress-indicator" style="width: ${percentage}%"></div>` : ''}
            </div>
        `;
    }).join('');
    
    // Scroll the active date to the center (mobile) or top (desktop)
    setTimeout(() => {
        const activeItem = dateSelector.querySelector('.date-item.active');
        if (activeItem && dateSelector) {
            // Check if desktop view (date selector is vertical)
            const isDesktop = window.innerWidth >= 768;
            
            if (isDesktop) {
                // On desktop, scroll to top
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
                
                // Set date selector height to half of calendar height
                const calendarContainer = document.querySelector('.big-calendar-container');
                if (calendarContainer) {
                    const calendarHeight = calendarContainer.offsetHeight;
                    dateSelector.style.height = `${calendarHeight / 2}px`;
                }
            } else {
                // On mobile, scroll to center horizontally
                const containerWidth = dateSelector.offsetWidth;
                const itemWidth = activeItem.offsetWidth;
                const itemLeft = activeItem.offsetLeft;
                const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
                
                dateSelector.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                });
            }
        }
    }, 10);
}

function selectDate(date) {
    selectedDate = date;
    renderDateSelector();
    renderTimeline();
    updateDayProgress();
    updateMonthYear();
    
    // Update calendar to show selected date's month if needed
    const selectedDateObj = new Date(date + 'T00:00:00');
    const selectedMonth = selectedDateObj.getMonth();
    const selectedYear = selectedDateObj.getFullYear();
    
    if (selectedMonth !== calendarCurrentMonth || selectedYear !== calendarCurrentYear) {
        calendarCurrentMonth = selectedMonth;
        calendarCurrentYear = selectedYear;
        renderBigCalendar();
    } else {
        renderBigCalendar(); // Re-render to highlight selected date
    }
}

function renderTimeline() {
    const t = translations[currentLang];
    const tasks = tasksByDay[selectedDate] || [];
    
    if (tasks.length === 0) {
        taskList.innerHTML = `<div class="empty-state">${t.noTasksDay}</div>`;
        return;
    }
    
    taskList.innerHTML = tasks.map((task, index) => createTaskListItem(task, selectedDate, index)).join('');
}

function createTaskListItem(task, date, index) {
    const t = translations[currentLang];
    const relativeDate = getRelativeDate(date);
    const completedClass = task.completed ? 'completed' : '';
    const checkIcon = task.completed ? 'fa-check-circle' : 'fa-circle';
    
    // Get project name if task is linked to a project
    let projectBadge = '';
    if (task.projectId) {
        const taskProjectId = typeof task.projectId === 'string' ? parseInt(task.projectId, 10) : task.projectId;
        const project = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
            return pId === taskProjectId || p.id === task.projectId;
        });
        if (project) {
            projectBadge = `<div class="task-project-badge" style="background: ${project.color || '#8B5CF6'}; margin-top: 4px;">
                <i class="fas fa-folder"></i> ${escapeHtml(project.name)}
            </div>`;
        }
    }
    
    return `
        <div class="task-list-item ${completedClass}">
            <button class="complete-task-btn" onclick="toggleTaskCompleted('${date}', ${task.id})" title="${task.completed ? (currentLang === 'ar' ? 'إلغاء الإكمال' : 'Mark as incomplete') : (currentLang === 'ar' ? 'تمييز كمكتمل' : 'Mark as complete')}">
                <i class="fas ${checkIcon}"></i>
            </button>
            <div class="task-list-icon">
                <i class="fas fa-tasks"></i>
            </div>
            <div class="task-list-info">
                <div class="task-list-title">${escapeHtml(task.title)}</div>
                <div class="task-list-date">${relativeDate}</div>
                ${projectBadge}
            </div>
            <div class="task-actions">
                <button class="edit-task-btn" onclick="event.stopPropagation(); editTask('${date}', ${task.id})" title="${currentLang === 'ar' ? 'تعديل' : 'Edit'}">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="delete-task-btn" onclick="event.stopPropagation(); deleteTask('${date}', ${task.id})" title="${currentLang === 'ar' ? 'حذف' : 'Delete'}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function editTask(date, id) {
    const task = tasksByDay[date]?.find(t => t.id === id);
    if (task) {
        openTaskModal(date, task);
    }
}

function updateMonthYear() {
    const date = new Date(selectedDate);
    const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    const month = date.toLocaleDateString(locale, { month: 'short' });
    
    // Also update big calendar month/year if it exists
    if (bigCalendarMonthYear) {
        const fullMonth = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
        bigCalendarMonthYear.textContent = fullMonth;
    }
    const year = date.getFullYear();
    if (monthYearDisplay) {
        monthYearDisplay.textContent = `${month}, ${year}`;
    }
}

// Render big calendar
function renderBigCalendar() {
    if (!bigCalendar) {
        console.log('Big calendar element not found');
        return;
    }
    
    // Ensure calendar month/year is set to current device month if not set
    if (calendarCurrentMonth === null || calendarCurrentYear === null) {
        const today = new Date();
        calendarCurrentMonth = today.getMonth();
        calendarCurrentYear = today.getFullYear();
    }
    
    const t = translations[currentLang];
    const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    
    // Update month/year header
    if (bigCalendarMonthYear) {
        const date = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
        bigCalendarMonthYear.textContent = date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    }
    
    // Get first day of month and number of days
    const firstDay = new Date(calendarCurrentYear, calendarCurrentMonth, 1);
    const lastDay = new Date(calendarCurrentYear, calendarCurrentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Get all dates that have tasks
    const datesWithTasks = new Set(Object.keys(tasksByDay));
    
    // Day names
    const dayNames = [];
    for (let i = 0; i < 7; i++) {
        const day = new Date(2024, 0, i + (currentLang === 'ar' ? 6 : 0)); // Start from Sunday for EN, Saturday for AR
        dayNames.push(day.toLocaleDateString(locale, { weekday: 'short' }));
    }
    
    let calendarHTML = '<div class="big-calendar-weekdays">';
    dayNames.forEach(day => {
        calendarHTML += `<div class="big-calendar-weekday">${day}</div>`;
    });
    calendarHTML += '</div><div class="big-calendar-days">';
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
        calendarHTML += '<div class="big-calendar-day empty"></div>';
    }
    
    // Add days of the month
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDay = today.getDate();
    const todayStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${calendarCurrentYear}-${String(calendarCurrentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTasks = datesWithTasks.has(dateStr);
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        
        let dayClass = 'big-calendar-day';
        if (isSelected) dayClass += ' selected';
        if (isToday) dayClass += ' today';
        if (hasTasks) dayClass += ' has-tasks';
        
        const taskCount = tasksByDay[dateStr] ? tasksByDay[dateStr].length : 0;
        const completedCount = tasksByDay[dateStr] ? tasksByDay[dateStr].filter(t => t.completed).length : 0;
        
        calendarHTML += `
            <div class="${dayClass}" data-date="${dateStr}" onclick="selectDate('${dateStr}')">
                <span class="big-calendar-day-number">${day}</span>
                ${hasTasks ? `<div class="big-calendar-day-indicator">
                    <span class="big-calendar-task-count">${taskCount}</span>
                    ${completedCount > 0 ? `<span class="big-calendar-completed-indicator" style="width: ${(completedCount / taskCount) * 100}%"></span>` : ''}
                </div>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    bigCalendar.innerHTML = calendarHTML;
    
    // Update date selector height on desktop after calendar renders
    updateDateSelectorHeight();
}

// Update date selector height to half of calendar height on desktop
function updateDateSelectorHeight() {
    if (window.innerWidth >= 768) {
        setTimeout(() => {
            const calendarContainer = document.querySelector('.big-calendar-container');
            const dateSelectorEl = document.getElementById('date-selector');
            if (calendarContainer && dateSelectorEl) {
                const calendarHeight = calendarContainer.offsetHeight;
                dateSelectorEl.style.height = `${calendarHeight / 2}px`;
            }
        }, 100);
    } else {
        // Reset height on mobile
        const dateSelectorEl = document.getElementById('date-selector');
        if (dateSelectorEl) {
            dateSelectorEl.style.height = 'auto';
        }
    }
}

function updateMonthTaskCount() {
    const t = translations[currentLang];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthTaskCount = 0;
    Object.keys(tasksByDay).forEach(dateStr => {
        const date = new Date(dateStr);
        if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            monthTaskCount += tasksByDay[dateStr].length;
        }
    });
    
    const countEl = document.getElementById('month-task-count');
    if (countEl) {
        if (currentLang === 'ar') {
            countEl.textContent = `${monthTaskCount} ${t.tasksThisMonth}`;
        } else {
            countEl.textContent = `${monthTaskCount} ${t.tasksThisMonth}`;
        }
    }
}

// Progress Functions
function updateTodayProgress() {
    const t = translations[currentLang];
    const today = new Date().toISOString().split('T')[0];
    const todayTasksList = tasksByDay[today] || [];
    const totalTasks = todayTasksList.length;
    const completedTasks = todayTasksList.filter(task => task.completed).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const progressText = document.getElementById('today-progress-text');
    const progressCount = document.getElementById('today-progress-count');
    const progressBar = document.getElementById('today-progress-bar');
    
    if (progressText) {
        progressText.textContent = currentLang === 'ar' 
            ? `تقدم اليوم: ${percentage}%` 
            : `Today's Progress: ${percentage}%`;
    }
    if (progressCount) {
        progressCount.textContent = `${completedTasks}/${totalTasks}`;
    }
    if (progressBar) {
        // Read current width first (before any changes)
        const container = progressBar.parentElement;
        let currentPercentage = 0;
        
        if (container && container.offsetWidth > 0) {
            // Try to get current width from inline style first
            if (progressBar.style.width) {
                currentPercentage = parseFloat(progressBar.style.width);
            } else {
                // Calculate from rendered width
                const currentWidth = progressBar.offsetWidth;
                const containerWidth = container.offsetWidth;
                if (containerWidth > 0) {
                    currentPercentage = (currentWidth / containerWidth) * 100;
                }
            }
        }
        
        // Ensure valid percentage
        if (isNaN(currentPercentage)) {
            currentPercentage = 0;
        }
        
        // If current and new are the same, no need to update
        if (Math.abs(currentPercentage - percentage) < 0.1) {
            return;
        }
        
        // Remove any inline style first to reset
        progressBar.style.removeProperty('width');
        
        // Force a reflow
        void progressBar.offsetWidth;
        
        // Set current width explicitly (this establishes the starting point)
        progressBar.style.width = `${currentPercentage}%`;
        
        // Force another reflow to ensure browser sees the starting point
        void progressBar.offsetWidth;
        
        // Now set the new width (without !important) - this should trigger CSS transition
        progressBar.style.width = `${percentage}%`;
    }
}

function updateDayProgress() {
    const t = translations[currentLang];
    const tasks = tasksByDay[selectedDate] || [];
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const progressText = document.getElementById('day-progress-text');
    const progressCount = document.getElementById('day-progress-count');
    const progressBar = document.getElementById('day-progress-bar');
    
    if (progressText) {
        progressText.textContent = currentLang === 'ar' 
            ? `التقدم: ${percentage}%` 
            : `Progress: ${percentage}%`;
    }
    if (progressCount) {
        progressCount.textContent = `${completedTasks}/${totalTasks}`;
    }
    if (progressBar) {
        // Get current width before clearing
        const currentPercentage = progressBar.style.width ? 
            parseFloat(progressBar.style.width) : 
            (progressBar.offsetWidth / progressBar.parentElement.offsetWidth) * 100;
        
        // Set current width explicitly to ensure smooth transition
        if (!progressBar.style.width || progressBar.style.width === '') {
            progressBar.style.width = `${currentPercentage}%`;
        }
        
        // Force a reflow
        void progressBar.offsetWidth;
        
        // Now set the new width with transition
        progressBar.style.setProperty('width', `${percentage}%`, 'important');
        
        // Trigger a reflow to ensure the browser sees the change and animates
        void progressBar.offsetWidth;
    }
}

// Utility Functions
function formatTime(time) {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

function getRelativeDate(dateString) {
    const t = translations[currentLang];
    const date = new Date(dateString + 'T00:00:00');
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
    
    const diffTime = dateOnly - todayOnly;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t.today;
    if (diffDays === 1) return t.tomorrow;
    if (diffDays === -1) return t.yesterday;
    if (diffDays > 1 && diffDays <= 7) return `${diffDays} ${t.daysFromNow}`;
    if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} ${t.daysAgo}`;
    
    const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Notes Management
async function saveNotes() {
    try {
        if (useBackend) {
            // Save all notes to backend (one by one as API supports individual saves)
            for (const note of notes) {
                try {
                    await NotesAPI.save(note);
                } catch (noteError) {
                    console.error(`Error saving note ${note.id}:`, noteError);
                }
            }
            console.log('Notes saved to server');
        } else {
            localStorage.setItem('notes', JSON.stringify(notes));
            console.log('Notes saved to localStorage');
        }
    } catch (error) {
        console.error('Error saving notes:', error);
        // Fallback to localStorage if API fails
        if (useBackend) {
            try {
                localStorage.setItem('notes', JSON.stringify(notes));
                console.log('Notes saved to localStorage as fallback');
            } catch (localError) {
                if (localError.name === 'QuotaExceededError') {
                    alert('Storage is full. Please clear some old notes.');
                }
            }
        } else {
            if (error.name === 'QuotaExceededError') {
                alert('Storage is full. Please clear some old notes.');
            }
        }
    }
}

async function addNote(noteData) {
    try {
        const { title, content, date, time } = noteData;
        
        if (!title || !content || !date || !time) {
            alert('Please fill in all required fields');
            return;
        }
        
        const note = {
            id: editingNoteId || Date.now(),
            title: title.trim(),
            content: content.trim(),
            date: date,
            time: time,
            createdAt: new Date().toISOString()
        };
        
        if (editingNoteId) {
            const index = notes.findIndex(n => n.id === editingNoteId);
            if (index !== -1) {
                notes[index] = note;
            }
            editingNoteId = null;
        } else {
            notes.push(note);
        }
        
        // Sort notes by date and time
        notes.sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.time}`);
            const dateB = new Date(`${b.date}T${b.time}`);
            return dateA - dateB;
        });
        
        // Save to backend server
        await saveNotes();
        console.log('Note saved to server');
        
        // Refresh UI without reload
        renderNotes();
        if (currentView === 'notes') {
            renderNotesView();
        }
    } catch (error) {
        console.error('Error adding note:', error);
        alert('Error adding note: ' + error.message);
    }
}

async function deleteNote(id) {
    // Delete from backend if using backend
    if (useBackend) {
        try {
            await NotesAPI.delete(id);
        } catch (error) {
            console.error('Error deleting note from server:', error);
        }
    }
    
    notes = notes.filter(note => note.id !== id);
    
    // Save to backend server (or localStorage as fallback)
    await saveNotes();
    
    // Refresh UI without reload
    renderNotes();
    if (currentView === 'notes') {
        renderNotesView();
    }
}

function editNote(id) {
    const note = notes.find(n => n.id === id);
    if (note) {
        openNoteModal(note);
    }
}

// Tab Switching
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    navTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
    
    // Show/hide tab content - only show active one
    const tasksContent = document.getElementById('tasks-tab-content');
    const projectsContent = document.getElementById('projects-tab-content');
    const notesContent = document.getElementById('notes-tab-content');
    
    // Hide all tab content first
    if (tasksContent) tasksContent.classList.remove('active');
    if (projectsContent) projectsContent.classList.remove('active');
    if (notesContent) notesContent.classList.remove('active');
    
    // Show only the active tab
    if (tabName === 'tasks' && tasksContent) {
        tasksContent.classList.add('active');
    } else if (tabName === 'projects' && projectsContent) {
        projectsContent.classList.add('active');
        renderProjects();
        // Ensure Add Project button event listener is attached when switching to projects tab
        setTimeout(() => {
            setupProjectButton();
        }, 100);
    } else if (tabName === 'notes' && notesContent) {
        notesContent.classList.add('active');
        renderNotes();
    }
    
    // Smooth scroll to top on desktop (mobile will handle naturally)
    if (window.innerWidth >= 768) {
        const mainContent = document.querySelector('.main-content-wrapper');
        if (mainContent) {
            mainContent.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
    } else {
        // On mobile, scroll to active content
        setTimeout(() => {
            let targetElement = null;
            if (tabName === 'tasks' && tasksContent) {
                targetElement = tasksContent;
            } else if (tabName === 'projects' && projectsContent) {
                targetElement = projectsContent;
            } else if (tabName === 'notes' && notesContent) {
                targetElement = notesContent;
            }
            
            if (targetElement) {
                const navTabsElement = document.querySelector('.nav-tabs');
                const navTabsHeight = navTabsElement ? navTabsElement.offsetHeight : 0;
                const targetPosition = targetElement.offsetTop - navTabsHeight - 20;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        }, 50);
    }
}

// Note Modal Functions
function openNoteModal(note = null) {
    if (!noteModal) {
        console.error('Note modal not found!');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        const titleInput = document.getElementById('note-title');
        const contentInput = document.getElementById('note-content');
        const dateInput = document.getElementById('note-date');
        const timeInput = document.getElementById('note-time');
        
        if (!titleInput || !contentInput || !dateInput || !timeInput) {
            console.error('Note form inputs not found!');
            return;
        }
        
        if (note) {
            titleInput.value = note.title || '';
            contentInput.value = note.content || '';
            dateInput.value = note.date || today;
            timeInput.value = note.time || '12:00';
            editingNoteId = note.id;
        } else {
            // Get current device time in HH:MM format
            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            titleInput.value = '';
            contentInput.value = '';
            dateInput.value = today;
            timeInput.value = currentTime;
            editingNoteId = null;
        }
        
        noteModal.classList.add('active');
        noteModal.style.display = 'block';
    } catch (error) {
        console.error('Error opening note modal:', error);
        alert('Error opening note modal: ' + error.message);
    }
}

function closeNoteModal() {
    if (noteModal) {
        noteModal.classList.remove('active');
        noteModal.style.display = 'none';
    }
    if (noteForm) {
        noteForm.reset();
    }
    editingNoteId = null;
}

async function handleNoteSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]') || e.target.querySelector('.create-task-btn');
    if (submitBtn && submitBtn.disabled) {
        return; // Already submitting, prevent duplicate
    }
    
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    const dateInput = document.getElementById('note-date');
    const timeInput = document.getElementById('note-time');
    
    if (!titleInput || !contentInput || !dateInput || !timeInput) {
        alert('Form error. Please refresh the page.');
        return;
    }
    
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const date = dateInput.value;
    const time = timeInput.value;
    
    if (!title) {
        alert('Please enter a note title');
        return;
    }
    
    if (!content) {
        alert('Please enter note content');
        return;
    }
    
    if (!date) {
        alert('Please select a date');
        return;
    }
    
    if (!time) {
        alert('Please select an alarm time');
        return;
    }
    
    // Show loading state
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
        
        // Disable form inputs
        const formInputs = e.target.querySelectorAll('input, select, textarea, button');
        formInputs.forEach(input => {
            if (input !== submitBtn) input.disabled = true;
        });
        
        try {
            await addNote({ title, content, date, time });
            
            // Close modal and reset form on success
            closeNoteModal();
            
            // Reset form
            e.target.reset();
            
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            formInputs.forEach(input => {
                if (input !== submitBtn) input.disabled = false;
            });
            
            // Switch to notes view if not already there
            if (currentView !== 'notes') {
                switchView('notes');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            // Restore button on error
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            formInputs.forEach(input => {
                if (input !== submitBtn) input.disabled = false;
            });
            alert('Error adding note: ' + (error.message || 'Unknown error'));
        }
    } else {
        try {
            await addNote({ title, content, date, time });
            closeNoteModal();
            e.target.reset();
            if (currentView !== 'notes') {
                switchView('notes');
            }
        } catch (error) {
            console.error('Error adding note:', error);
            alert('Error adding note: ' + (error.message || 'Unknown error'));
        }
    }
}

// Render Notes
function renderNotes() {
    const t = translations[currentLang];
    
    if (!notesList) return;
    
    if (notes.length === 0) {
        notesList.innerHTML = `<div class="empty-state">${t.noNotes}</div>`;
        return;
    }
    
    // Sort notes by date and time
    const sortedNotes = [...notes].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateA - dateB;
    });
    
    notesList.innerHTML = sortedNotes.map(note => createNoteCard(note)).join('');
}

function createNoteCard(note) {
    const t = translations[currentLang];
    const noteDate = new Date(`${note.date}T${note.time}`);
    const now = new Date();
    const isPast = noteDate < now;
    const relativeDate = getRelativeDate(note.date);
    const formattedTime = formatTime(note.time);
    
    return `
        <div class="note-card ${isPast ? 'past' : ''}" onclick="editNote(${note.id})">
            <div class="note-icon">
                <i class="fas fa-sticky-note"></i>
            </div>
            <div class="note-info">
                <div class="note-title">${escapeHtml(note.title)}</div>
                <div class="note-content-preview">${escapeHtml(note.content.length > 100 ? note.content.substring(0, 100) + '...' : note.content)}</div>
                <div class="note-meta">
                    <span class="note-date">${relativeDate}</span>
                    <span class="note-time">${formattedTime}</span>
                </div>
            </div>
            <div class="note-actions">
                <button class="delete-note-btn" onclick="event.stopPropagation(); deleteNote(${note.id})" title="${currentLang === 'ar' ? 'حذف' : 'Delete'}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

// Task Notification System
function startNotificationChecker() {
    // Stub function - task notifications can be implemented here if needed
    // Currently, notifications are handled when tasks are completed
}

// Note Notification System
let shownNoteNotifications = new Set();
let noteNotificationInterval = null;

function checkNoteNotifications() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    notes.forEach(note => {
        // Only check notes for today
        if (note.date !== today) return;
        
        const noteTime = note.time;
        const [noteHour, noteMinute] = noteTime.split(':').map(Number);
        const [currentHour, currentMinute] = currentTime.split(':').map(Number);
        
        const noteTimeMinutes = noteHour * 60 + noteMinute;
        const currentTimeMinutes = currentHour * 60 + currentMinute;
        
        // Check if it's time for the note notification (exact time match)
        if (noteTimeMinutes === currentTimeMinutes) {
            const notificationId = `note-${note.id}`;
            // Only show notification if it hasn't been shown yet
            if (!shownNoteNotifications.has(notificationId)) {
                shownNoteNotifications.add(notificationId);
                // Show notification, delete note, and refresh page
                handleNoteTimeReached(note);
            }
            return;
        }
        
        // Don't remove notification if time has passed - let user dismiss it manually
        // Notifications will stay visible until user clicks the close button
    });
}

async function showNoteNotification(note) {
    const t = translations[currentLang];
    const notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) return;
    
    const notificationId = `note-${note.id}`;
    const formattedTime = formatTime(note.time);
    
    const notification = document.createElement('div');
    notification.className = 'notification note-alarm';
    notification.id = notificationId;
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-bell"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${t.noteAlarm}</div>
            <div class="notification-message">${escapeHtml(note.title)}</div>
            <div class="notification-time">${formattedTime}</div>
        </div>
        <button class="notification-close" onclick="dismissNoteNotification('${notificationId}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    notificationContainer.appendChild(notification);
}

// Handle when a note's time is reached: delete note immediately, show notification (stays until manually dismissed)
async function handleNoteTimeReached(note) {
    // Delete the note immediately when time is reached
    await deleteNoteAfterNotification(note.id);
    
    // Show notification - it will stay visible until user manually dismisses it
    await showNoteNotification(note);
    
    // Refresh notes view if we're on the notes page
    if (currentView === 'notes') {
        renderNotesView();
    }
}

async function dismissNoteNotification(id) {
    const notification = document.getElementById(id);
    if (notification) {
        // Note is already deleted when time was reached, just remove the notification UI
        // Animate and remove notification
        notification.style.animation = 'fadeOutNotification 0.3s ease forwards';
        setTimeout(() => {
            notification.remove();
            shownNoteNotifications.delete(id);
        }, 300);
    }
}

function startNoteNotificationChecker() {
    // Check every second for accurate timing
    if (noteNotificationInterval) {
        clearInterval(noteNotificationInterval);
    }
    noteNotificationInterval = setInterval(checkNoteNotifications, 1000);
    // Also check immediately
    checkNoteNotifications();
}

// Check for notes that should trigger notifications when page loads
async function checkNotesForNotificationsOnLoad() {
    // This function is kept for backward compatibility but is no longer needed
    // as notifications are now handled directly in checkNoteNotifications()
}

// Delete note after notification is shown
async function deleteNoteAfterNotification(noteId) {
    try {
        // Delete from backend if using backend
        if (useBackend) {
            try {
                await NotesAPI.delete(noteId);
            } catch (error) {
                console.error('Error deleting note from server:', error);
            }
        }
        
        // Remove from local array
        notes = notes.filter(n => n.id !== noteId);
        
        // Save updated notes
        await saveNotes();
        
        // Remove from shown notifications
        const notificationId = `note-${noteId}`;
        shownNoteNotifications.delete(notificationId);
    } catch (error) {
        console.error('Error deleting note after notification:', error);
    }
}

// ==================== PROJECT MANAGEMENT ====================

// Save projects
async function saveProjects() {
    try {
        if (useBackend) {
            await ProjectsAPI.saveAll(projects);
            console.log('Projects saved to API');
        } else {
            localStorage.setItem('projects', JSON.stringify(projects));
            console.log('Projects saved to localStorage');
        }
    } catch (error) {
        console.error('Error saving projects:', error);
        if (useBackend) {
            try {
                localStorage.setItem('projects', JSON.stringify(projects));
                console.log('Projects saved to localStorage as fallback');
            } catch (localError) {
                if (localError.name === 'QuotaExceededError') {
                    alert('Storage is full. Please clear some old projects.');
                }
            }
        }
    }
}

// Project Templates
const projectTemplates = {
    website: {
        name: 'Website Development',
        description: 'Complete website development project',
        tasks: [
            { name: 'Design Phase', date: '' },
            { name: 'Development Phase', date: '' },
            { name: 'Testing Phase', date: '' },
            { name: 'Launch', date: '' }
        ]
    },
    event: {
        name: 'Event Planning',
        description: 'Plan and execute an event',
        tasks: [
            { name: 'Venue Booking', date: '' },
            { name: 'Vendor Confirmation', date: '' },
            { name: 'Marketing Campaign', date: '' },
            { name: 'Event Day', date: '' }
        ]
    },
    content: {
        name: 'Content Creation',
        description: 'Create content for marketing',
        tasks: [
            { name: 'Content Planning', date: '' },
            { name: 'Content Creation', date: '' },
            { name: 'Review & Edit', date: '' },
            { name: 'Publishing', date: '' }
        ]
    },
    personal: {
        name: 'Personal Goals',
        description: 'Track personal development goals',
        tasks: [
            { name: 'Goal Setting', date: '' },
            { name: 'Action Plan', date: '' },
            { name: 'Progress Check', date: '' },
            { name: 'Goal Achievement', date: '' }
        ]
    }
};

// Add task to project form
function addProjectTask() {
    const container = document.getElementById('tasks-container');
    if (!container) return;
    
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task-item';
    taskDiv.innerHTML = `
        <input type="text" placeholder="Task name" class="task-name" required>
        <input type="date" class="task-date">
        <button type="button" class="remove-task-btn" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    container.appendChild(taskDiv);
}

// Open project modal
function openProjectModal(project = null) {
    const modal = document.getElementById('project-modal');
    if (!modal) return;
    
    const nameInput = document.getElementById('project-name');
    const descInput = document.getElementById('project-description');
    const startDateInput = document.getElementById('project-start-date');
    const endDateInput = document.getElementById('project-end-date');
    const prioritySelect = document.getElementById('project-priority');
    const statusSelect = document.getElementById('project-status');
    const templateSelect = document.getElementById('project-template');
    const tasksContainer = document.getElementById('tasks-container');
    const modalTitle = document.getElementById('project-modal-title');
    
    if (!nameInput || !startDateInput || !endDateInput) return;
    
    // Reset form
    if (project) {
        editingProjectId = project.id;
        nameInput.value = project.name || '';
        descInput.value = project.description || '';
        startDateInput.value = project.startDate || '';
        endDateInput.value = project.endDate || '';
        prioritySelect.value = project.priority || 'medium';
        statusSelect.value = project.status || 'not-started';
        selectedProjectColor = project.color || '#8B5CF6';
        if (modalTitle) modalTitle.textContent = 'Edit Project';
        
        // Set color
        document.querySelectorAll('.color-option').forEach(opt => {
            opt.classList.toggle('active', opt.dataset.color === selectedProjectColor);
        });
        
        // Load tasks (from milestones for backward compatibility) - tasks container removed, tasks are linked via task creation
        if (tasksContainer) {
            tasksContainer.innerHTML = '';
            const tasksToLoad = project.tasks && project.tasks.length > 0 ? project.tasks.map(t => ({ name: `Task ${t.taskId}`, date: '' })) : 
                               (project.milestones && project.milestones.length > 0 ? project.milestones : []);
            if (tasksToLoad.length > 0) {
                tasksToLoad.forEach(task => {
                    const taskDiv = document.createElement('div');
                    taskDiv.className = 'task-item';
                    taskDiv.innerHTML = `
                        <input type="text" placeholder="Task name" class="task-name" value="${escapeHtml(task.name || '')}" required>
                        <input type="date" class="task-date" value="${task.date || ''}">
                        <button type="button" class="remove-task-btn" onclick="this.parentElement.remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    tasksContainer.appendChild(taskDiv);
                });
            }
        }
    } else {
        editingProjectId = null;
        const today = new Date().toISOString().split('T')[0];
        nameInput.value = '';
        descInput.value = '';
        startDateInput.value = today;
        endDateInput.value = '';
        prioritySelect.value = 'medium';
        statusSelect.value = 'not-started';
        selectedProjectColor = '#8B5CF6';
        if (modalTitle) modalTitle.textContent = 'Create New Project';
        if (tasksContainer) tasksContainer.innerHTML = '';
        
        // Reset color picker
        document.querySelectorAll('.color-option').forEach((opt, index) => {
            opt.classList.toggle('active', index === 0);
        });
    }
    
    // Template change handler
    if (templateSelect) {
        templateSelect.onchange = function() {
            if (this.value && projectTemplates[this.value]) {
                const template = projectTemplates[this.value];
                if (nameInput) nameInput.value = template.name;
                if (descInput) descInput.value = template.description;
                if (tasksContainer) {
                    tasksContainer.innerHTML = '';
                    const templateTasks = template.tasks || template.milestones || [];
                    templateTasks.forEach(task => {
                        const taskDiv = document.createElement('div');
                        taskDiv.className = 'task-item';
                        taskDiv.innerHTML = `
                            <input type="text" placeholder="Task name" class="task-name" value="${escapeHtml(task.name)}" required>
                            <input type="date" class="task-date" value="${task.date || ''}">
                            <button type="button" class="remove-task-btn" onclick="this.parentElement.remove()">
                                <i class="fas fa-times"></i>
                            </button>
                        `;
                        tasksContainer.appendChild(taskDiv);
                    });
                }
            }
        };
    }
    
    modal.classList.add('active');
    modal.style.display = 'block';
}

// Close project modal
function closeProjectModal() {
    const modal = document.getElementById('project-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    const form = document.getElementById('project-form');
    if (form) {
        form.reset();
    }
    editingProjectId = null;
    selectedProjectColor = '#8B5CF6';
}

let isSubmittingProject = false;

// Handle project form submit
async function handleProjectSubmit(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]') || document.getElementById('project-submit-btn');
    if (submitBtn && submitBtn.disabled) {
        return; // Already submitting, prevent duplicate
    }
    
    const nameInput = document.getElementById('project-name');
    const descInput = document.getElementById('project-description');
    const startDateInput = document.getElementById('project-start-date');
    const endDateInput = document.getElementById('project-end-date');
    const prioritySelect = document.getElementById('project-priority');
    const statusSelect = document.getElementById('project-status');
    const tasksContainer = document.getElementById('tasks-container');
    
    if (!nameInput || !startDateInput || !endDateInput) return;
    
    const name = nameInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const startDate = startDateInput.value;
    const endDate = endDateInput.value;
    const priority = prioritySelect.value;
    const status = statusSelect.value;
    
    if (!name) {
        alert('Please enter a project name');
        return;
    }
    
    if (!startDate || !endDate) {
        alert('Please select both start and end dates');
        return;
    }
    
    // Show loading state
    if (submitBtn) {
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.style.opacity = '0.7';
        submitBtn.style.cursor = 'not-allowed';
        
        // Disable form inputs
        const formInputs = e.target.querySelectorAll('input, select, textarea, button');
        formInputs.forEach(input => {
            if (input !== submitBtn && input.id !== 'add-project-task-btn') input.disabled = true;
        });
        
        try {
            // Collect tasks (tasks are now managed through linking, so we keep existing tasks)
            const project = {
                id: editingProjectId || Date.now(),
                name,
                description,
                startDate,
                endDate,
                priority,
                status,
                color: selectedProjectColor,
                createdAt: editingProjectId ? projects.find(p => {
                    const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                    const editId = typeof editingProjectId === 'string' ? parseInt(editingProjectId, 10) : editingProjectId;
                    return pId === editId || p.id === editingProjectId;
                })?.createdAt || new Date().toISOString() : new Date().toISOString(),
                tasks: editingProjectId ? (projects.find(p => {
                    const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                    const editId = typeof editingProjectId === 'string' ? parseInt(editingProjectId, 10) : editingProjectId;
                    return pId === editId || p.id === editingProjectId;
                })?.tasks || []).filter(t => t && t.taskId !== undefined && t.taskId !== null) : []
            };
            
            await addProject(project);
        } catch (error) {
            // Restore button on error
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = 'pointer';
            formInputs.forEach(input => {
                if (input !== submitBtn && input.id !== 'add-project-task-btn') input.disabled = false;
            });
        }
    } else {
        // Collect tasks (tasks are now managed through linking, so we keep existing tasks)
        const project = {
            id: editingProjectId || Date.now(),
            name,
            description,
            startDate,
            endDate,
            priority,
            status,
            color: selectedProjectColor,
            createdAt: editingProjectId ? projects.find(p => {
                const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                const editId = typeof editingProjectId === 'string' ? parseInt(editingProjectId, 10) : editingProjectId;
                return pId === editId || p.id === editingProjectId;
            })?.createdAt || new Date().toISOString() : new Date().toISOString(),
            tasks: editingProjectId ? (projects.find(p => {
                const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                const editId = typeof editingProjectId === 'string' ? parseInt(editingProjectId, 10) : editingProjectId;
                return pId === editId || p.id === editingProjectId;
            })?.tasks || []).filter(t => t && t.taskId !== undefined && t.taskId !== null) : []
        };
        
        await addProject(project);
    }
}

// Add or update project
async function addProject(project) {
    // Prevent duplicate submissions
    if (isSubmittingProject) {
        console.log('Project submission already in progress, ignoring duplicate call');
        return;
    }
    
    isSubmittingProject = true;
    
    try {
        // Check if project with same ID already exists (prevent duplicates)
        if (!editingProjectId) {
            const existingProject = projects.find(p => 
                p.id === project.id || (p.name === project.name && p.startDate === project.startDate)
            );
            
            if (existingProject) {
                console.log('Project already exists, skipping duplicate');
                isSubmittingProject = false;
                return;
            }
        }
        
        if (editingProjectId) {
            const editId = typeof editingProjectId === 'string' ? parseInt(editingProjectId, 10) : editingProjectId;
            const index = projects.findIndex(p => {
                const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                return pId === editId || p.id === editingProjectId;
            });
            if (index !== -1) {
                projects[index] = project;
            }
            editingProjectId = null;
        } else {
            projects.push(project);
        }
        
        await saveProjects();
        closeProjectModal();
        
        // Refresh the UI without reloading
        renderProjects();
        if (currentView === 'dashboard' && currentTab === 'projects') {
            renderProjects();
        }
    } catch (error) {
        console.error('Error adding project:', error);
        alert('Error saving project: ' + error.message);
        isSubmittingProject = false;
    }
}

// Delete project
async function deleteProject(id) {
    try {
        // Convert id to number for consistent comparison
        const projectId = typeof id === 'string' ? parseInt(id, 10) : id;
        
        // Find the project to get its tasks before deleting
        const projectToDelete = projects.find(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
            return pId === projectId || p.id === id;
        });
        
        // Unlink all tasks from this project
        if (projectToDelete && projectToDelete.tasks && projectToDelete.tasks.length > 0) {
            for (const taskRef of projectToDelete.tasks) {
                // Find and update all tasks linked to this project
                for (const date in tasksByDay) {
                    const taskIndex = tasksByDay[date].findIndex(task => {
                        const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                        const refTaskId = typeof taskRef.taskId === 'string' ? parseInt(taskRef.taskId, 10) : taskRef.taskId;
                        return (taskId === refTaskId || task.id === taskRef.taskId) && 
                               (task.projectId === projectId || task.projectId === id);
                    });
                    if (taskIndex !== -1) {
                        tasksByDay[date][taskIndex].projectId = null;
                    }
                }
            }
            await saveTasks();
        }
        
        // Remove project
        projects = projects.filter(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
            return pId !== projectId && p.id !== id;
        });
        
        if (useBackend) {
            await ProjectsAPI.delete(projectId);
        }
        await saveProjects();
        renderProjects();
        window.location.reload();
    } catch (error) {
        console.error('Error deleting project:', error);
        alert('Error deleting project: ' + error.message);
    }
}

// Edit project
function editProject(id) {
    const projectId = typeof id === 'string' ? parseInt(id, 10) : id;
    const project = projects.find(p => {
        const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
        return pId === projectId || p.id === id;
    });
    if (project) {
        openProjectModal(project);
    }
}

// Calculate project progress
function calculateProjectProgress(project) {
    // Ensure tasks array exists
    if (!project.tasks || !Array.isArray(project.tasks) || project.tasks.length === 0) {
        // Check milestones if no tasks (backward compatibility)
        if (project.milestones && Array.isArray(project.milestones) && project.milestones.length > 0) {
            const completedMilestones = project.milestones.filter(m => m.completed).length;
            return Math.round((completedMilestones / project.milestones.length) * 100);
        }
        return 0;
    }
    
    const completedTasks = project.tasks.filter(t => {
        if (!t || t.taskId === undefined || t.taskId === null) return false;
        
        const taskDate = Object.keys(tasksByDay).find(date => {
            return tasksByDay[date].some(task => {
                // Handle type consistency for ID comparison
                const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                return (taskId === refTaskId || task.id === t.taskId);
            });
        });
        
        if (taskDate) {
            const task = tasksByDay[taskDate].find(task => {
                const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                return (taskId === refTaskId || task.id === t.taskId);
            });
            return task && task.completed === true;
        }
        return false;
    }).length;
    
    return project.tasks.length > 0 ? Math.round((completedTasks / project.tasks.length) * 100) : 0;
}

// Get project tasks count
function getProjectTasksCount(project) {
    if (!project.tasks) return 0;
    return project.tasks.length;
}

// Switch project view
function switchProjectView(view) {
    currentProjectView = view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    document.querySelectorAll('.projects-view').forEach(v => {
        v.classList.toggle('active', v.id === `projects-${view}-view`);
    });
    
    if (view === 'grid') {
        renderProjectsGrid();
    } else if (view === 'kanban') {
        renderKanban();
    } else if (view === 'analytics') {
        renderAnalytics();
    }
}

// Render projects
function renderProjects() {
    switchProjectView(currentProjectView);
}

// Render projects grid
function renderProjectsGrid() {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;
    
    if (projects.length === 0) {
        grid.innerHTML = '<div class="empty-state">No projects yet. Create your first project!</div>';
        return;
    }
    
    grid.innerHTML = projects.map(project => createProjectCard(project)).join('');
}

// Create project card
function createProjectCard(project) {
    const progress = calculateProjectProgress(project);
    const tasksCount = getProjectTasksCount(project);
    const daysRemaining = calculateDaysRemaining(project.endDate);
    const statusClass = project.status;
    const projectColor = project.color || '#8B5CF6';
    
    return `
        <div class="project-card" style="--card-top-color: ${projectColor};">
            <div class="project-card-header">
                <div style="flex: 1; min-width: 0;">
                    <div class="project-card-title">${escapeHtml(project.name)}</div>
                    <div class="project-meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${formatDate(project.startDate)} - ${formatDate(project.endDate)}</span>
                    </div>
                </div>
                <div class="project-card-actions" onclick="event.stopPropagation();">
                    <button class="project-card-btn" onclick="editProject(${project.id})" title="Edit">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="project-card-btn" onclick="deleteProject(${project.id})" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            ${project.description ? `<div class="project-card-description">${escapeHtml(project.description)}</div>` : ''}
            <div class="project-card-meta">
                <span class="project-status-badge ${statusClass}">${project.status.replace('-', ' ')}</span>
                <span class="project-priority-badge ${project.priority}">${project.priority}</span>
                ${daysRemaining !== null ? `<span class="project-meta-item"><i class="fas fa-clock"></i> ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} left</span>` : ''}
            </div>
            <div class="project-card-progress">
                <div class="project-progress-header">
                    <span class="project-progress-text">Progress</span>
                    <span class="project-progress-text">${progress}%</span>
                </div>
                <div class="project-progress-bar">
                    <div class="project-progress-fill" style="width: ${progress}%; background: ${projectColor};"></div>
                </div>
            </div>
            <div class="project-card-footer">
                <span class="project-meta-item">
                    <i class="fas fa-tasks"></i> ${tasksCount} ${tasksCount === 1 ? 'task' : 'tasks'}
                </span>
                <button class="project-details-btn" onclick="event.stopPropagation(); toggleProjectDetails(${project.id})" title="Show Details">
                    <i class="fas fa-chevron-down"></i> <span>Details</span>
                </button>
            </div>
            <div class="project-details-expanded" id="project-details-${project.id}" style="display: none;">
                <div class="project-details-content">
                    <div class="project-details-section">
                        <h4><i class="fas fa-tasks"></i> Tasks</h4>
                        ${project.tasks && project.tasks.length > 0 ? `
                            <div class="tasks-list">
                                ${project.tasks.map(taskRef => {
                                    if (!taskRef || taskRef.taskId === undefined || taskRef.taskId === null) return '';
                                    
                                    const refTaskId = typeof taskRef.taskId === 'string' ? parseInt(taskRef.taskId, 10) : taskRef.taskId;
                                    const taskDate = Object.keys(tasksByDay).find(date => 
                                        tasksByDay[date].some(task => {
                                            const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                                            return taskId === refTaskId || task.id === taskRef.taskId;
                                        })
                                    );
                                    if (taskDate) {
                                        const task = tasksByDay[taskDate].find(task => {
                                            const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                                            return taskId === refTaskId || task.id === taskRef.taskId;
                                        });
                                        if (task) {
                                            return `
                                                <div class="task-detail-item ${task.completed ? 'completed' : ''}">
                                                    <input type="checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTaskCompleted('${taskDate}', ${task.id})">
                                                    <div class="task-detail-info">
                                                        <span class="task-detail-name">${escapeHtml(task.title)}</span>
                                                        <span class="task-detail-date">${formatDate(taskDate)} • ${formatTime(task.startTime)} - ${formatTime(task.endTime)}</span>
                                                    </div>
                                                </div>
                                            `;
                                        }
                                    }
                                    return '';
                                }).filter(item => item !== '').join('')}
                            </div>
                        ` : '<p style="color: var(--text-light); padding: 10px;">No tasks linked to this project yet.</p>'}
                    </div>
                    <div class="project-details-section">
                        <h4><i class="fas fa-chart-line"></i> Progress Details</h4>
                        <div class="progress-details">
                            <div class="progress-detail-item">
                                <span>Tasks Completed:</span>
                                <span class="progress-value">${project.tasks ? project.tasks.filter(t => {
                                    if (!t || t.taskId === undefined || t.taskId === null) return false;
                                    const refTaskId = typeof t.taskId === 'string' ? parseInt(t.taskId, 10) : t.taskId;
                                    const taskDate = Object.keys(tasksByDay).find(date => 
                                        tasksByDay[date].some(task => {
                                            const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                                            return taskId === refTaskId || task.id === t.taskId;
                                        })
                                    );
                                    if (taskDate) {
                                        const task = tasksByDay[taskDate].find(task => {
                                            const taskId = typeof task.id === 'string' ? parseInt(task.id, 10) : task.id;
                                            return taskId === refTaskId || task.id === t.taskId;
                                        });
                                        return task && task.completed === true;
                                    }
                                    return false;
                                }).length : 0} / ${tasksCount}</span>
                            </div>
                            <div class="progress-detail-item">
                                <span>Overall Progress:</span>
                                <span class="progress-value">${progress}%</span>
                            </div>
                            ${project.tasks && project.tasks.length > 0 ? `
                                <div class="progress-detail-item">
                                    <span>Tasks Linked:</span>
                                    <span class="progress-value">${project.tasks.length} tasks</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render kanban board
function renderKanban() {
    const statuses = ['not-started', 'in-progress', 'on-hold', 'completed'];
    
    statuses.forEach(status => {
        const column = document.getElementById(`kanban-${status}`);
        const countEl = document.getElementById(`kanban-${status}-count`);
        if (!column) return;
        
        const statusProjects = projects.filter(p => p.status === status);
        if (countEl) countEl.textContent = statusProjects.length;
        
        if (statusProjects.length === 0) {
            column.innerHTML = '<div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-light);">No projects</div>';
        } else {
            column.innerHTML = statusProjects.map(project => createKanbanCard(project)).join('');
        }
    });
    
    // Setup drag and drop
    setupKanbanDragDrop();
}

// Create kanban card
function createKanbanCard(project) {
    const progress = calculateProjectProgress(project);
    const tasksCount = getProjectTasksCount(project);
    
    return `
        <div class="kanban-project-card" draggable="true" data-project-id="${project.id}" style="border-left-color: ${project.color || '#8B5CF6'};">
            <div style="font-weight: 600; margin-bottom: 8px;">${escapeHtml(project.name)}</div>
            <div style="font-size: 0.85em; color: var(--text-light); margin-bottom: 10px;">${escapeHtml(project.description || 'No description')}</div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                <span style="font-size: 0.8em; color: var(--text-light);">
                    <i class="fas fa-tasks"></i> ${tasksCount} tasks
                </span>
                <span style="font-size: 0.8em; font-weight: 600; color: ${project.color || '#8B5CF6'};">${progress}%</span>
            </div>
            <div style="margin-top: 8px;">
                <div style="height: 4px; background: var(--bg-light); border-radius: 2px; overflow: hidden;">
                    <div style="height: 100%; width: ${progress}%; background: ${project.color || '#8B5CF6'}; transition: width 0.3s;"></div>
                </div>
            </div>
        </div>
    `;
}

// Setup kanban drag and drop
function setupKanbanDragDrop() {
    const cards = document.querySelectorAll('.kanban-project-card');
    const columns = document.querySelectorAll('.kanban-column-content');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', card.dataset.projectId);
            card.classList.add('dragging');
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
        });
    });
    
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            const projectId = parseInt(e.dataTransfer.getData('text/plain'));
            const newStatus = column.closest('.kanban-column').dataset.status;
            
            const project = projects.find(p => {
                const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
                return pId === projectId || p.id === projectId;
            });
            if (project && project.status !== newStatus) {
                project.status = newStatus;
                await saveProjects();
                renderKanban();
            }
        });
    });
}

// Render analytics
function renderAnalytics() {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status !== 'completed').length;
    const completedProjects = projects.filter(p => p.status === 'completed').length;
    
    // Calculate overall progress
    let totalProgress = 0;
    if (projects.length > 0) {
        totalProgress = Math.round(projects.reduce((sum, p) => sum + calculateProjectProgress(p), 0) / projects.length);
    }
    
    // Update analytics cards
    const totalEl = document.getElementById('analytics-total-projects');
    const activeEl = document.getElementById('analytics-active-projects');
    const completedEl = document.getElementById('analytics-completed-projects');
    const progressEl = document.getElementById('analytics-overall-progress');
    
    if (totalEl) totalEl.textContent = totalProjects;
    if (activeEl) activeEl.textContent = activeProjects;
    if (completedEl) completedEl.textContent = completedProjects;
    if (progressEl) progressEl.textContent = totalProgress + '%';
    
    // Render charts
    renderStatusChart();
    renderPriorityChart();
}

// Render status chart
function renderStatusChart() {
    const canvas = document.getElementById('projects-status-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const statusCounts = {
        'not-started': projects.filter(p => p.status === 'not-started').length,
        'in-progress': projects.filter(p => p.status === 'in-progress').length,
        'on-hold': projects.filter(p => p.status === 'on-hold').length,
        'completed': projects.filter(p => p.status === 'completed').length
    };
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    const colors = ['#9CA3AF', '#3B82F6', '#F59E0B', '#10B981'];
    const labels = ['Not Started', 'In Progress', 'On Hold', 'Completed'];
    const values = Object.values(statusCounts);
    const total = values.reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    let currentAngle = -Math.PI / 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) / 2 - 20;
    
    values.forEach((value, index) => {
        if (value === 0) return;
        
        const sliceAngle = (value / total) * 2 * Math.PI;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[index];
        ctx.fill();
        
        // Label
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, labelX, labelY);
        
        currentAngle += sliceAngle;
    });
    
    // Legend
    let legendY = canvas.height - 60;
    labels.forEach((label, index) => {
        ctx.fillStyle = colors[index];
        ctx.fillRect(20, legendY, 15, 15);
        ctx.fillStyle = '#1F2937';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${label}: ${values[index]}`, 40, legendY + 12);
        legendY += 20;
    });
}

// Render priority chart
function renderPriorityChart() {
    const canvas = document.getElementById('projects-priority-chart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const priorityCounts = {
        'low': projects.filter(p => p.priority === 'low').length,
        'medium': projects.filter(p => p.priority === 'medium').length,
        'high': projects.filter(p => p.priority === 'high').length
    };
    
    canvas.width = canvas.offsetWidth;
    canvas.height = 200;
    
    const colors = ['#10B981', '#F59E0B', '#EF4444'];
    const labels = ['Low', 'Medium', 'High'];
    const values = [priorityCounts.low, priorityCounts.medium, priorityCounts.high];
    const total = values.reduce((a, b) => a + b, 0);
    
    if (total === 0) {
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No data available', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    const barWidth = (canvas.width - 80) / 3;
    const maxValue = Math.max(...values);
    const barHeight = canvas.height - 80;
    
    values.forEach((value, index) => {
        const x = 40 + index * (barWidth + 20);
        const height = (value / maxValue) * barHeight;
        const y = canvas.height - 40 - height;
        
        ctx.fillStyle = colors[index];
        ctx.fillRect(x, y, barWidth, height);
        
        // Value label
        ctx.fillStyle = '#1F2937';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + barWidth / 2, y - 5);
        
        // Label
        ctx.fillStyle = '#6B7280';
        ctx.font = '12px sans-serif';
        ctx.fillText(labels[index], x + barWidth / 2, canvas.height - 20);
    });
}

// View project details
function viewProjectDetails(id) {
    const project = projects.find(p => p.id === id);
    if (project) {
        // For now, just open edit modal. Can be enhanced with a detail view
        openProjectModal(project);
    }
}

// Toggle project details (milestones and progress)
function toggleProjectDetails(id) {
    const detailsDiv = document.getElementById(`project-details-${id}`);
    const btn = event.target.closest('.project-details-btn');
    const icon = btn ? btn.querySelector('i') : null;
    
    if (detailsDiv) {
        const isVisible = detailsDiv.style.display !== 'none';
        detailsDiv.style.display = isVisible ? 'none' : 'block';
        
        if (icon) {
            icon.classList.toggle('fa-chevron-down', isVisible);
            icon.classList.toggle('fa-chevron-up', !isVisible);
        }
        
        if (btn) {
            const span = btn.querySelector('span');
            if (span) {
                span.textContent = isVisible ? 'Details' : 'Hide Details';
            }
        }
    }
}

// Toggle milestone completion (kept for backward compatibility)
async function toggleMilestone(projectId, milestoneIndex, completed) {
    const project = projects.find(p => p.id === projectId);
    if (project && project.milestones && project.milestones[milestoneIndex]) {
        project.milestones[milestoneIndex].completed = completed;
        await saveProjects();
        
        // Update the card to reflect new progress
        renderProjects();
    }
}

// Helper functions
function calculateDaysRemaining(endDate) {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(currentLang === 'ar' ? 'ar-SA' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ============================================
// AI Assistant Functions
// ============================================

// Initialize AI chat with welcome message
function initializeAIChat() {
    if (aiChatMessages) {
        // Load chat history
        loadChatHistory();
        
        // If no history, show welcome message
        if (aiChatMessages.children.length === 0) {
            addAIMessage('assistant', 'Hello! I\'m your AI assistant. I can help you add tasks, projects, and notes to your list. Just tell me what you\'d like to add, or chat with me about anything!');
        }
    }
}

// Save chat history to localStorage
function saveChatHistory() {
    if (!aiChatMessages) return;
    
    const messages = [];
    aiChatMessages.querySelectorAll('.ai-message').forEach(msg => {
        // Skip temporary messages (like loading indicators)
        if (msg.getAttribute('data-temp') === 'true') return;
        
        const role = msg.classList.contains('user') ? 'user' : 
                    msg.classList.contains('assistant') ? 'assistant' : 'system';
        messages.push({
            role: role,
            content: msg.textContent
        });
    });
    
    localStorage.setItem('aiChatHistory', JSON.stringify(messages));
}

// Load chat history from localStorage
function loadChatHistory() {
    if (!aiChatMessages) return;
    
    try {
        const history = localStorage.getItem('aiChatHistory');
        if (history) {
            const messages = JSON.parse(history);
            aiChatMessages.innerHTML = ''; // Clear existing messages
            messages.forEach(msg => {
                addAIMessage(msg.role, msg.content, false); // Don't save on each add
            });
        }
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Delete chat history
function deleteChatHistory() {
    if (!aiChatMessages) return;
    
    if (confirm('Are you sure you want to delete all chat history?')) {
        localStorage.removeItem('aiChatHistory');
        aiChatMessages.innerHTML = '';
        addAIMessage('assistant', 'Hello! I\'m your AI assistant. I can help you add tasks, projects, and notes to your list. Just tell me what you\'d like to add, or chat with me about anything!');
    }
}

// Toggle AI chat window
function toggleAIChat() {
    if (aiChatWindow) {
        aiChatWindow.classList.toggle('active');
        if (aiChatWindow.classList.contains('active') && aiChatInput) {
            aiChatInput.focus();
        }
    }
}

// Close AI chat window
function closeAIChat() {
    if (aiChatWindow) {
        aiChatWindow.classList.remove('active');
    }
}

// Add message to chat
function addAIMessage(role, content, saveToHistory = true) {
    if (!aiChatMessages) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ai-message ${role}`;
    messageDiv.textContent = content;
    aiChatMessages.appendChild(messageDiv);
    aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    
    // Save to history after adding
    if (saveToHistory) {
        saveChatHistory();
    }
}

// Send message to AI
async function sendAIMessage() {
    if (!aiChatInput || !aiChatSend) return;
    
    const message = aiChatInput.value.trim();
    if (!message) return;
    
    // Disable input and send button
    aiChatInput.disabled = true;
    aiChatSend.disabled = true;
    
    // Add user message to chat
    addAIMessage('user', message);
    
    // Clear input
    aiChatInput.value = '';
    
    // Show loading indicator (don't save to history)
    let loadingMessageDiv = null;
    if (aiChatMessages) {
        loadingMessageDiv = document.createElement('div');
        loadingMessageDiv.className = 'ai-message assistant';
        loadingMessageDiv.textContent = 'Thinking...';
        loadingMessageDiv.setAttribute('data-temp', 'true'); // Mark as temporary
        aiChatMessages.appendChild(loadingMessageDiv);
        aiChatMessages.scrollTop = aiChatMessages.scrollHeight;
    }
    
    try {
        // Call Gemini API
        const response = await callGeminiAPI(message);
        
        // Remove loading message
        if (loadingMessageDiv && loadingMessageDiv.parentNode) {
            loadingMessageDiv.parentNode.removeChild(loadingMessageDiv);
        }
        
        // Parse response
        const parsedResponse = parseAIResponse(response);
        
        if (parsedResponse.action === 'add_task') {
            // Add task automatically with all parsed information
            await handleAITaskCreation(parsedResponse);
            const taskTitle = parsedResponse.task || 'the task';
            addAIMessage('assistant', `Great! I've added "${taskTitle}" to your task list${parsedResponse.date ? ` for ${parsedResponse.date}` : ''}${parsedResponse.startTime ? ` from ${parsedResponse.startTime} to ${parsedResponse.endTime || 'end time'}` : ''}.`);
        } else if (parsedResponse.action === 'edit_task') {
            // Edit task automatically
            await handleAITaskEdit(parsedResponse);
            addAIMessage('assistant', `Great! I've updated the task for you.`);
        } else if (parsedResponse.action === 'add_project') {
            // Add project automatically
            await handleAIProjectCreation(parsedResponse);
            const projectName = parsedResponse.name || 'the project';
            addAIMessage('assistant', `Great! I've created the project "${projectName}" for you.`);
        } else if (parsedResponse.action === 'edit_project') {
            // Edit project automatically
            await handleAIProjectEdit(parsedResponse);
            addAIMessage('assistant', `Great! I've updated the project for you.`);
        } else if (parsedResponse.action === 'add_note') {
            // Add note automatically
            await handleAINoteCreation(parsedResponse);
            const noteTitle = parsedResponse.title || 'the note';
            addAIMessage('assistant', `Great! I've added the note "${noteTitle}" to your notes.`);
        } else if (parsedResponse.action === 'edit_note') {
            // Edit note automatically
            await handleAINoteEdit(parsedResponse);
            addAIMessage('assistant', `Great! I've updated the note for you.`);
        } else {
            // Regular chat response
            addAIMessage('assistant', parsedResponse.text || response);
        }
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        // Remove loading message if it exists
        if (loadingMessageDiv && loadingMessageDiv.parentNode) {
            loadingMessageDiv.parentNode.removeChild(loadingMessageDiv);
        }
        // Show more detailed error message
        const errorMsg = error.message || 'Unknown error occurred';
        addAIMessage('assistant', `Sorry, I encountered an error: ${errorMsg}. Please check the console for more details or try again.`);
    } finally {
        // Re-enable input and send button
        aiChatInput.disabled = false;
        aiChatSend.disabled = false;
        aiChatInput.focus();
    }
}

// Call Google Gemini API
async function callGeminiAPI(userMessage) {
    // Get current tasks, projects, and notes for context
    const allTasks = Object.values(tasksByDay).flat();
    const tasksList = allTasks.slice(0, 10).map(t => `- "${t.title}" (ID: ${t.id}, Date: ${t.date || 'unknown'})`).join('\\n');
    const projectsList = projects.slice(0, 10).map(p => `- "${p.name}" (ID: ${p.id})`).join('\\n');
    const notesList = notes.slice(0, 10).map(n => `- "${n.title}" (ID: ${n.id}, Date: ${n.date || 'unknown'})`).join('\\n');
    
    const systemInstruction = `You are a helpful task manager assistant. Your role is to help users manage their tasks, projects, and notes.

IMPORTANT INSTRUCTIONS:
- If the user asks to ADD a TASK, create a task, or mentions wanting to do something that should be a task, you MUST respond with ONLY a JSON object in this exact format: {"action": "add_task", "task": "Task description", "date": "YYYY-MM-DD", "startTime": "HH:MM", "endTime": "HH:MM"}
- If the user asks to EDIT/UPDATE a TASK, change a task, modify a task, you MUST respond with ONLY a JSON object. Include taskId and ANY fields the user wants to change. Available task fields: title (or "task"), description, date, startTime, endTime, category, projectId, completed (true/false). Format: {"action": "edit_task", "taskId": "task_id_or_name", "title": "New title (optional)", "description": "New description (optional)", "date": "YYYY-MM-DD (optional)", "startTime": "HH:MM (optional)", "endTime": "HH:MM (optional)", "category": "work|personal|shopping|health|other (optional)", "projectId": "project_id (optional)", "completed": true/false (optional)}
- If the user asks to ADD a PROJECT, create a project, or mentions a project they want to start, you MUST respond with ONLY a JSON object in this exact format: {"action": "add_project", "name": "Project name", "description": "Project description", "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "priority": "low|medium|high", "status": "not-started|in-progress|completed"}
- If the user asks to EDIT/UPDATE a PROJECT, change a project, modify a project, you MUST respond with ONLY a JSON object. Include projectId and ANY fields the user wants to change. Available project fields: name, description, startDate, endDate, priority (low|medium|high), status (not-started|in-progress|completed), color (hex color code). Format: {"action": "edit_project", "projectId": "project_id_or_name", "name": "New name (optional)", "description": "New description (optional)", "startDate": "YYYY-MM-DD (optional)", "endDate": "YYYY-MM-DD (optional)", "priority": "low|medium|high (optional)", "status": "not-started|in-progress|completed (optional)", "color": "#HEXCODE (optional)"}
- If the user asks to ADD a NOTE, create a note, or mentions something they want to remember, you MUST respond with ONLY a JSON object in this exact format: {"action": "add_note", "title": "Note title", "content": "Note content", "date": "YYYY-MM-DD", "time": "HH:MM"}
- If the user asks to EDIT/UPDATE a NOTE, change a note, modify a note, you MUST respond with ONLY a JSON object. Include noteId and ANY fields the user wants to change. Available note fields: title, content, date, time. Format: {"action": "edit_note", "noteId": "note_id_or_name", "title": "New title (optional)", "content": "New content (optional)", "date": "YYYY-MM-DD (optional)", "time": "HH:MM (optional)"}

For EDITING:
- Use taskId/projectId/noteId to identify the item. You can use the item's name/title if the ID is not available. Match by partial name if exact match is not found.
- You can edit ANY field of the object. Include only the fields the user wants to change in the JSON.
- For tasks: category can be "work", "personal", "shopping", "health", or "other". completed can be true or false.
- For projects: priority can be "low", "medium", or "high". status can be "not-started", "in-progress", or "completed". color should be a hex code like "#8B5CF6".
- If the user mentions changing any property, include it in the JSON response.

For TASKS:
- Extract date and time information from the user's message. If date is mentioned (like "tomorrow", "9/1/2026", etc.), parse it to YYYY-MM-DD format. If not mentioned, use today's date.
- If time is mentioned (like "5pm", "5:00 pm", "17:00"), parse it to 24-hour HH:MM format. If start time is mentioned but end time is not, set end time to 1 hour after start time. If no time is mentioned, use current time for start and 1 hour later for end.

For PROJECTS:
- Extract start and end dates from the user's message. If dates are mentioned, parse them to YYYY-MM-DD format. If not mentioned, use today for start date and 30 days later for end date.
- Priority defaults to "medium" if not specified. Status defaults to "not-started" if not specified.
- Description is optional but recommended.

For NOTES:
- Extract date and time from the user's message. If date is mentioned, parse it to YYYY-MM-DD format. If not mentioned, use today's date.
- If time is mentioned, parse it to 24-hour HH:MM format. If not mentioned, use current time.
- Title and content are required for new notes, optional for edits.

- For general conversation, questions, or non-action-related requests, respond normally with helpful text.
- Be friendly and conversational.
- If the user's message is ambiguous about what they want to do, ask for clarification in a friendly way.

Available Tasks (first 10):\\n${tasksList || 'No tasks found'}
Available Projects (first 10):\\n${projectsList || 'No projects found'}
Available Notes (first 10):\\n${notesList || 'No notes found'}

Examples:
- User: "Add a task to buy milk" → Response: {"action": "add_task", "task": "Buy milk", "date": "2024-01-15", "startTime": "14:00", "endTime": "15:00"}
- User: "Edit the task 'Buy milk' to change the time to 5pm" → Response: {"action": "edit_task", "taskId": "Buy milk", "startTime": "17:00", "endTime": "18:00"}
- User: "Change the category of 'Buy milk' task to shopping" → Response: {"action": "edit_task", "taskId": "Buy milk", "category": "shopping"}
- User: "Mark the task 'Buy milk' as completed" → Response: {"action": "edit_task", "taskId": "Buy milk", "completed": true}
- User: "Update the Website Redesign project status to in-progress" → Response: {"action": "edit_project", "projectId": "Website Redesign", "status": "in-progress"}
- User: "Change the Website Redesign project priority to high" → Response: {"action": "edit_project", "projectId": "Website Redesign", "priority": "high"}
- User: "Update the Website Redesign project color to #10B981" → Response: {"action": "edit_project", "projectId": "Website Redesign", "color": "#10B981"}
- User: "Change the note 'Call John' to tomorrow at 3pm" → Response: {"action": "edit_note", "noteId": "Call John", "date": "2024-01-16", "time": "15:00"}
- User: "Update the content of note 'Call John' to 'Call John about the meeting'" → Response: {"action": "edit_note", "noteId": "Call John", "content": "Call John about the meeting"}
- User: "What's the weather like?" → Response: "I'm a task manager assistant, so I can't check the weather, but I can help you manage your tasks, projects, or notes!"
- User: "Hello" → Response: "Hello! How can I help you with your tasks, projects, or notes today?"

Current date: ${new Date().toISOString().split('T')[0]}
Current time: ${new Date().toTimeString().split(' ')[0].substring(0, 5)}

User message: ${userMessage}`;

    const requestBody = {
        contents: [{
            parts: [{
                text: systemInstruction
            }]
        }]
    };

    try {
        const url = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
        console.log('Calling Gemini API:', url);
        console.log('Request body:', requestBody);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            let errorMessage = `API request failed: ${response.status} ${response.statusText}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error && errorJson.error.message) {
                    errorMessage += `. ${errorJson.error.message}`;
                }
            } catch (e) {
                errorMessage += `. ${errorText.substring(0, 200)}`;
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        console.log('Gemini API Response:', data);
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
            return data.candidates[0].content.parts[0].text;
        }
        
        // Check for alternative response format
        if (data.error) {
            throw new Error(`API Error: ${data.error.message || JSON.stringify(data.error)}`);
        }
        
        throw new Error('Invalid response format from API. Response: ' + JSON.stringify(data).substring(0, 200));
    } catch (error) {
        console.error('Gemini API Error:', error);
        // Re-throw with more context
        if (error.message) {
            throw error;
        }
        throw new Error(`Failed to call Gemini API: ${error.toString()}`);
    }
}

// Parse AI response to check for task, project, or note creation/editing
function parseAIResponse(response) {
    try {
        // Try to parse as JSON first - look for JSON in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.action === 'add_task' && parsed.task) {
                return parsed;
            }
            if (parsed.action === 'edit_task' && parsed.taskId) {
                return parsed;
            }
            if (parsed.action === 'add_project' && parsed.name) {
                return parsed;
            }
            if (parsed.action === 'edit_project' && parsed.projectId) {
                return parsed;
            }
            if (parsed.action === 'add_note' && parsed.title && parsed.content) {
                return parsed;
            }
            if (parsed.action === 'edit_note' && parsed.noteId) {
                return parsed;
            }
        }
        
        // Also try parsing the entire response as JSON
        const parsed = JSON.parse(response.trim());
        if (parsed.action === 'add_task' && parsed.task) {
            return parsed;
        }
        if (parsed.action === 'edit_task' && parsed.taskId) {
            return parsed;
        }
        if (parsed.action === 'add_project' && parsed.name) {
            return parsed;
        }
        if (parsed.action === 'edit_project' && parsed.projectId) {
            return parsed;
        }
        if (parsed.action === 'add_note' && parsed.title && parsed.content) {
            return parsed;
        }
        if (parsed.action === 'edit_note' && parsed.noteId) {
            return parsed;
        }
    } catch (e) {
        // Not JSON, return as text
        console.log('Response is not JSON, treating as text:', response);
    }
    
    return { text: response };
}

// Handle automatic task creation from AI
async function handleAITaskCreation(taskInfo) {
    try {
        // taskInfo can be a string (just description) or an object with task, date, startTime, endTime
        let taskDescription, taskDate, taskStartTime, taskEndTime;
        
        if (typeof taskInfo === 'string') {
            taskDescription = taskInfo;
            taskDate = new Date().toISOString().split('T')[0];
            const now = new Date();
            const currentHour = now.getHours();
            const nextHour = (currentHour + 1) % 24;
            taskStartTime = `${String(currentHour).padStart(2, '0')}:00`;
            taskEndTime = `${String(nextHour).padStart(2, '0')}:00`;
        } else {
            taskDescription = taskInfo.task || taskInfo.title || 'New task';
            taskDate = taskInfo.date || new Date().toISOString().split('T')[0];
            taskStartTime = taskInfo.startTime || (() => {
                const now = new Date();
                return `${String(now.getHours()).padStart(2, '0')}:00`;
            })();
            taskEndTime = taskInfo.endTime || (() => {
                const start = taskInfo.startTime || (() => {
                    const now = new Date();
                    return `${String(now.getHours()).padStart(2, '0')}:00`;
                })();
                const [hours, minutes] = start.split(':').map(Number);
                const nextHour = (hours + 1) % 24;
                return `${String(nextHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            })();
        }
        
        // Validate and format date
        if (!isValidDate(taskDate)) {
            taskDate = new Date().toISOString().split('T')[0];
        }
        
        // Validate and format times
        if (!isValidTime(taskStartTime)) {
            const now = new Date();
            taskStartTime = `${String(now.getHours()).padStart(2, '0')}:00`;
        }
        if (!isValidTime(taskEndTime)) {
            const [hours] = taskStartTime.split(':').map(Number);
            const nextHour = (hours + 1) % 24;
            taskEndTime = `${String(nextHour).padStart(2, '0')}:00`;
        }
        
        // Create task data
        const taskData = {
            date: taskDate,
            title: taskDescription,
            description: '', // AI-created tasks have no description by default
            startTime: taskStartTime,
            endTime: taskEndTime,
            category: selectedCategory || 'personal',
            projectId: null
        };
        
        console.log('Creating task from AI:', taskData);
        
        // Use existing addTask function
        await addTask(taskData);
        
        // Refresh the UI
        renderTimeline();
        updateDayProgress();
        updateTodayProgress();
        updateMonthTaskCount();
        if (bigCalendar) {
            renderBigCalendar();
        }
        
        console.log('Task created from AI successfully');
    } catch (error) {
        console.error('Error creating task from AI:', error);
        addAIMessage('assistant', `I had trouble adding that task: ${error.message}. Please try again or add it manually.`);
    }
}

// Helper function to validate date format
function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

// Helper function to validate time format
function isValidTime(timeString) {
    const regex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
    return regex.test(timeString);
}

// Handle automatic project creation from AI
async function handleAIProjectCreation(projectInfo) {
    try {
        const projectName = projectInfo.name || 'New Project';
        const description = projectInfo.description || '';
        const startDate = projectInfo.startDate || new Date().toISOString().split('T')[0];
        
        // Calculate end date (30 days from start if not provided)
        let endDate = projectInfo.endDate;
        if (!endDate || !isValidDate(endDate)) {
            const start = new Date(startDate);
            start.setDate(start.getDate() + 30);
            endDate = start.toISOString().split('T')[0];
        }
        
        const priority = projectInfo.priority || 'medium';
        const status = projectInfo.status || 'not-started';
        
        // Validate dates
        if (!isValidDate(startDate)) {
            throw new Error('Invalid start date');
        }
        if (!isValidDate(endDate)) {
            throw new Error('Invalid end date');
        }
        
        // Create project object
        const project = {
            id: Date.now(),
            name: projectName,
            description: description,
            startDate: startDate,
            endDate: endDate,
            priority: priority,
            status: status,
            color: '#8B5CF6', // Default purple color
            createdAt: new Date().toISOString(),
            tasks: []
        };
        
        console.log('Creating project from AI:', project);
        
        // Use existing addProject function
        await addProject(project);
        
        // Refresh the UI
        renderProjects();
        
        console.log('Project created from AI successfully');
    } catch (error) {
        console.error('Error creating project from AI:', error);
        addAIMessage('assistant', `I had trouble creating that project: ${error.message}. Please try again or create it manually.`);
    }
}

// Handle automatic note creation from AI
async function handleAINoteCreation(noteInfo) {
    try {
        const title = noteInfo.title || 'New Note';
        const content = noteInfo.content || '';
        const date = noteInfo.date || new Date().toISOString().split('T')[0];
        
        // Get current time if not provided
        let time = noteInfo.time;
        if (!time || !isValidTime(time)) {
            const now = new Date();
            time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        }
        
        // Validate date
        if (!isValidDate(date)) {
            throw new Error('Invalid date');
        }
        
        // Validate time
        if (!isValidTime(time)) {
            throw new Error('Invalid time');
        }
        
        // Create note object
        const note = {
            id: Date.now(),
            title: title,
            content: content,
            date: date,
            time: time,
            createdAt: new Date().toISOString()
        };
        
        console.log('Creating note from AI:', note);
        
        // Use existing addNote function
        await addNote(note);
        
        // Refresh the UI
        renderNotes();
        if (currentView === 'notes') {
            renderNotesView();
        }
        
        console.log('Note created from AI successfully');
    } catch (error) {
        console.error('Error creating note from AI:', error);
        addAIMessage('assistant', `I had trouble creating that note: ${error.message}. Please try again or create it manually.`);
    }
}

// Handle automatic task editing from AI
async function handleAITaskEdit(editInfo) {
    try {
        const taskIdOrName = editInfo.taskId;
        if (!taskIdOrName) {
            throw new Error('Task ID or name is required');
        }
        
        // Find the task by ID or name
        let taskToEdit = null;
        let taskDate = null;
        
        // Try to find by ID first
        const taskIdNum = typeof taskIdOrName === 'string' && !isNaN(taskIdOrName) ? parseInt(taskIdOrName, 10) : taskIdOrName;
        for (const date in tasksByDay) {
            const task = tasksByDay[date].find(t => {
                const tId = typeof t.id === 'string' ? parseInt(t.id, 10) : t.id;
                return tId === taskIdNum || t.id === taskIdOrName;
            });
            if (task) {
                taskToEdit = task;
                taskDate = date;
                break;
            }
        }
        
        // If not found by ID, try to find by name (partial match)
        if (!taskToEdit) {
            const searchName = taskIdOrName.toString().toLowerCase();
            for (const date in tasksByDay) {
                const task = tasksByDay[date].find(t => 
                    t.title && t.title.toLowerCase().includes(searchName)
                );
                if (task) {
                    taskToEdit = task;
                    taskDate = date;
                    break;
                }
            }
        }
        
        if (!taskToEdit) {
            throw new Error(`Task "${taskIdOrName}" not found`);
        }
        
        // Update any provided fields dynamically
        // Handle title (can be "task" or "title")
        if (editInfo.task !== undefined) {
            taskToEdit.title = editInfo.task;
        }
        if (editInfo.title !== undefined) {
            taskToEdit.title = editInfo.title;
        }
        
        // Handle date (special case - need to move task if date changes)
        if (editInfo.date !== undefined) {
            if (isValidDate(editInfo.date)) {
                // If date changed, move task to new date
                if (editInfo.date !== taskDate) {
                    // Remove from old date
                    tasksByDay[taskDate] = tasksByDay[taskDate].filter(t => t.id !== taskToEdit.id);
                    if (tasksByDay[taskDate].length === 0) {
                        delete tasksByDay[taskDate];
                    }
                    // Add to new date
                    if (!tasksByDay[editInfo.date]) {
                        tasksByDay[editInfo.date] = [];
                    }
                    taskDate = editInfo.date;
                }
            }
        }
        
        // Handle time fields
        if (editInfo.startTime !== undefined && isValidTime(editInfo.startTime)) {
            taskToEdit.startTime = editInfo.startTime;
        }
        if (editInfo.endTime !== undefined && isValidTime(editInfo.endTime)) {
            taskToEdit.endTime = editInfo.endTime;
        }
        
        // Handle description
        if (editInfo.description !== undefined) {
            taskToEdit.description = editInfo.description;
        }
        
        // Handle category
        if (editInfo.category !== undefined) {
            const validCategories = ['work', 'personal', 'shopping', 'health', 'other'];
            if (validCategories.includes(editInfo.category)) {
                taskToEdit.category = editInfo.category;
            }
        }
        
        // Handle projectId
        if (editInfo.projectId !== undefined) {
            // Allow null/empty to unlink from project
            if (editInfo.projectId === null || editInfo.projectId === '' || editInfo.projectId === 'null') {
                taskToEdit.projectId = null;
            } else {
                taskToEdit.projectId = editInfo.projectId;
            }
        }
        
        // Handle completed status
        if (editInfo.completed !== undefined) {
            taskToEdit.completed = editInfo.completed === true || editInfo.completed === 'true';
        }
        
        // Ensure task is in the correct date array
        if (!tasksByDay[taskDate].some(t => t.id === taskToEdit.id)) {
            tasksByDay[taskDate].push(taskToEdit);
        }
        
        console.log('Editing task from AI:', taskToEdit);
        
        // Save tasks
        await saveTasks();
        
        // Refresh the UI
        renderTimeline();
        updateDayProgress();
        updateTodayProgress();
        updateMonthTaskCount();
        
        console.log('Task edited from AI successfully');
    } catch (error) {
        console.error('Error editing task from AI:', error);
        addAIMessage('assistant', `I had trouble editing that task: ${error.message}. Please try again or edit it manually.`);
    }
}

// Handle automatic project editing from AI
async function handleAIProjectEdit(editInfo) {
    try {
        const projectIdOrName = editInfo.projectId;
        if (!projectIdOrName) {
            throw new Error('Project ID or name is required');
        }
        
        // Find the project by ID or name
        let projectToEdit = null;
        let projectIndex = -1;
        
        // Try to find by ID first
        const projectIdNum = typeof projectIdOrName === 'string' && !isNaN(projectIdOrName) ? parseInt(projectIdOrName, 10) : projectIdOrName;
        projectIndex = projects.findIndex(p => {
            const pId = typeof p.id === 'string' ? parseInt(p.id, 10) : p.id;
            return pId === projectIdNum || p.id === projectIdOrName;
        });
        
        // If not found by ID, try to find by name (partial match)
        if (projectIndex === -1) {
            const searchName = projectIdOrName.toString().toLowerCase();
            projectIndex = projects.findIndex(p => 
                p.name && p.name.toLowerCase().includes(searchName)
            );
        }
        
        if (projectIndex === -1) {
            throw new Error(`Project "${projectIdOrName}" not found`);
        }
        
        projectToEdit = projects[projectIndex];
        
        // Update any provided fields dynamically
        if (editInfo.name !== undefined) {
            projectToEdit.name = editInfo.name;
        }
        if (editInfo.description !== undefined) {
            projectToEdit.description = editInfo.description;
        }
        if (editInfo.startDate !== undefined && isValidDate(editInfo.startDate)) {
            projectToEdit.startDate = editInfo.startDate;
        }
        if (editInfo.endDate !== undefined && isValidDate(editInfo.endDate)) {
            projectToEdit.endDate = editInfo.endDate;
        }
        if (editInfo.priority !== undefined) {
            const validPriorities = ['low', 'medium', 'high'];
            if (validPriorities.includes(editInfo.priority)) {
                projectToEdit.priority = editInfo.priority;
            }
        }
        if (editInfo.status !== undefined) {
            const validStatuses = ['not-started', 'in-progress', 'completed'];
            if (validStatuses.includes(editInfo.status)) {
                projectToEdit.status = editInfo.status;
            }
        }
        if (editInfo.color !== undefined) {
            // Validate hex color format
            if (/^#[0-9A-Fa-f]{6}$/.test(editInfo.color)) {
                projectToEdit.color = editInfo.color;
            }
        }
        
        console.log('Editing project from AI:', projectToEdit);
        
        // Save projects
        await saveProjects();
        
        // Refresh the UI
        renderProjects();
        
        console.log('Project edited from AI successfully');
    } catch (error) {
        console.error('Error editing project from AI:', error);
        addAIMessage('assistant', `I had trouble editing that project: ${error.message}. Please try again or edit it manually.`);
    }
}

// Handle automatic note editing from AI
async function handleAINoteEdit(editInfo) {
    try {
        const noteIdOrName = editInfo.noteId;
        if (!noteIdOrName) {
            throw new Error('Note ID or name is required');
        }
        
        // Find the note by ID or name
        let noteToEdit = null;
        let noteIndex = -1;
        
        // Try to find by ID first
        const noteIdNum = typeof noteIdOrName === 'string' && !isNaN(noteIdOrName) ? parseInt(noteIdOrName, 10) : noteIdOrName;
        noteIndex = notes.findIndex(n => {
            const nId = typeof n.id === 'string' ? parseInt(n.id, 10) : n.id;
            return nId === noteIdNum || n.id === noteIdOrName;
        });
        
        // If not found by ID, try to find by name (partial match)
        if (noteIndex === -1) {
            const searchName = noteIdOrName.toString().toLowerCase();
            noteIndex = notes.findIndex(n => 
                n.title && n.title.toLowerCase().includes(searchName)
            );
        }
        
        if (noteIndex === -1) {
            throw new Error(`Note "${noteIdOrName}" not found`);
        }
        
        noteToEdit = notes[noteIndex];
        
        // Update any provided fields dynamically
        if (editInfo.title !== undefined) {
            noteToEdit.title = editInfo.title;
        }
        if (editInfo.content !== undefined) {
            noteToEdit.content = editInfo.content;
        }
        if (editInfo.date !== undefined && isValidDate(editInfo.date)) {
            noteToEdit.date = editInfo.date;
        }
        if (editInfo.time !== undefined && isValidTime(editInfo.time)) {
            noteToEdit.time = editInfo.time;
        }
        
        console.log('Editing note from AI:', noteToEdit);
        
        // Save notes
        await saveNotes();
        
        // Refresh the UI
        renderNotes();
        if (currentView === 'notes') {
            renderNotesView();
        }
        
        addAIMessage('assistant', `Note "${noteToEdit.title}" has been updated successfully!`);
        console.log('Note edited from AI successfully');
    } catch (error) {
        console.error('Error editing note from AI:', error);
        addAIMessage('assistant', `I had trouble editing that note: ${error.message}. Please try again or edit it manually.`);
    }
}

// Make functions globally available
window.selectDate = selectDate;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.toggleTaskCompleted = toggleTaskCompleted;
window.deleteNote = deleteNote;
window.editNote = editNote;
window.dismissNoteNotification = dismissNoteNotification;
window.deleteProject = deleteProject;
window.editProject = editProject;
window.viewProjectDetails = viewProjectDetails;
window.addProjectTask = addProjectTask;
window.switchProjectView = switchProjectView;
window.toggleProjectDetails = toggleProjectDetails;
window.toggleMilestone = toggleMilestone;
window.switchView = switchView;

// Dark Mode Functions
function initializeDarkMode() {
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcons();
    setupThemeToggleListeners();
}

function toggleDarkMode() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('darkMode', isDarkMode);
    updateThemeIcons();
}

function updateThemeIcons() {
    const themeIcons = document.querySelectorAll('#theme-icon, #theme-icon-2, #theme-icon-projects, #theme-icon-analytics, #theme-icon-profile');
    themeIcons.forEach(icon => {
        if (icon) {
            if (isDarkMode) {
                icon.className = 'fas fa-sun';
                icon.style.color = '#FBBF24';
            } else {
                icon.className = 'fas fa-moon';
                icon.style.color = '';
            }
        }
    });
}

function setupThemeToggleListeners() {
    const themeButtons = document.querySelectorAll('#theme-toggle-btn, #theme-toggle-btn-2, #theme-toggle-btn-projects, #theme-toggle-btn-analytics, #theme-toggle-btn-profile');
    themeButtons.forEach(btn => {
        if (btn) {
            // Remove existing listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', toggleDarkMode);
        }
    });
}

// Render Projects View
function renderProjectsView() {
    if (!projectsView) return;
    
    // Render projects grid by default
    renderProjectsGridStandalone();
    
    // Setup project view controls
    setupProjectViewControlsStandalone();
    
    // Setup add project button
    const addProjectBtn = document.getElementById('add-project-btn-standalone');
    if (addProjectBtn) {
        // Remove existing listeners
        const newBtn = addProjectBtn.cloneNode(true);
        addProjectBtn.parentNode.replaceChild(newBtn, addProjectBtn);
        newBtn.addEventListener('click', () => {
            openProjectModal();
        });
    }
}

// Render projects grid for standalone view
function renderProjectsGridStandalone() {
    const grid = document.getElementById('projects-grid-standalone');
    if (!grid) return;
    
    if (projects.length === 0) {
        const t = translations[currentLang];
        grid.innerHTML = `<div class="empty-state">
            <i class="fas fa-folder-open" style="font-size: 3em; color: var(--text-light); margin-bottom: 20px;"></i>
            <p style="color: var(--text-light);">${t.noProjects || 'No projects yet. Create your first project!'}</p>
        </div>`;
        return;
    }
    
    grid.innerHTML = projects.map(project => createProjectCard(project)).join('');
}

// Setup project view controls for standalone view
function setupProjectViewControlsStandalone() {
    const viewBtns = projectsView.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        // Remove existing listeners
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        newBtn.addEventListener('click', (e) => {
            const view = e.currentTarget.dataset.view;
            switchProjectViewStandalone(view);
        });
    });
}

// Switch project view for standalone
function switchProjectViewStandalone(view) {
    currentProjectView = view;
    
    // Update buttons
    const viewBtns = projectsView.querySelectorAll('.view-btn');
    viewBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    // Update views
    const gridView = document.getElementById('projects-grid-view-standalone');
    const kanbanView = document.getElementById('projects-kanban-view-standalone');
    const analyticsView = document.getElementById('projects-analytics-view-standalone');
    
    if (gridView) gridView.classList.toggle('active', view === 'grid');
    if (kanbanView) kanbanView.classList.toggle('active', view === 'kanban');
    if (analyticsView) analyticsView.classList.toggle('active', view === 'analytics');
    
    if (view === 'grid') {
        renderProjectsGridStandalone();
    } else if (view === 'kanban') {
        renderKanbanStandalone();
    } else if (view === 'analytics') {
        renderProjectsAnalyticsStandalone();
    }
}

// Render kanban for standalone
function renderKanbanStandalone() {
    const statuses = ['not-started', 'in-progress', 'on-hold', 'completed'];
    statuses.forEach(status => {
        const column = document.getElementById(`kanban-${status}-standalone`);
        const countEl = document.getElementById(`kanban-${status}-count-standalone`);
        if (!column) return;
        
        const statusProjects = projects.filter(p => p.status === status);
        if (countEl) countEl.textContent = statusProjects.length;
        
        if (statusProjects.length === 0) {
            column.innerHTML = '<div class="empty-state" style="text-align: center; padding: 20px; color: var(--text-light);">No projects</div>';
        } else {
            column.innerHTML = statusProjects.map(project => createKanbanCard(project)).join('');
        }
    });
}

// Render projects analytics for standalone
function renderProjectsAnalyticsStandalone() {
    const totalEl = document.getElementById('analytics-total-projects-standalone');
    const activeEl = document.getElementById('analytics-active-projects-standalone');
    const completedEl = document.getElementById('analytics-completed-projects-standalone');
    const progressEl = document.getElementById('analytics-overall-progress-standalone');
    
    if (totalEl) totalEl.textContent = projects.length;
    if (activeEl) activeEl.textContent = projects.filter(p => p.status === 'in-progress').length;
    if (completedEl) completedEl.textContent = projects.filter(p => p.status === 'completed').length;
    
    if (progressEl && projects.length > 0) {
        const totalProgress = projects.reduce((sum, p) => sum + calculateProjectProgress(p), 0);
        const avgProgress = Math.round(totalProgress / projects.length);
        progressEl.textContent = `${avgProgress}%`;
    }
}

// Render Notes View
function renderNotesView() {
    if (!notesView) return;
    const notesListEl = notesView.querySelector('#notes-list-view');
    if (!notesListEl) return;
    
    // Temporarily update notesList reference to render in notes view
    const originalNotesList = notesList;
    notesList = notesListEl;
    
    // Render notes - this will populate the notes list with all notes
    renderNotes();
    
    // Restore original reference
    notesList = originalNotesList;
    
    // Setup add note button
    const addNoteBtn = document.getElementById('add-note-btn-notes-view');
    if (addNoteBtn) {
        // Remove existing listeners to prevent duplicates
        const newBtn = addNoteBtn.cloneNode(true);
        addNoteBtn.parentNode.replaceChild(newBtn, addNoteBtn);
        newBtn.addEventListener('click', () => {
            openNoteModal();
        });
    }
}

// Render Analytics View
function renderAnalyticsView() {
    if (!analyticsView) return;
    const content = analyticsView.querySelector('.analytics-view-content');
    if (!content) return;
    
    const t = translations[currentLang];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Calculate statistics
    let totalTasks = 0;
    let completedTasks = 0;
    let totalProjects = projects.length;
    let activeProjects = projects.filter(p => p.status === 'in-progress').length;
    let totalNotes = notes.length;
    
    // Count tasks
    for (const date in tasksByDay) {
        const tasks = tasksByDay[date];
        totalTasks += tasks.length;
        completedTasks += tasks.filter(t => t.completed).length;
    }
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Tasks by category
    const tasksByCategory = {};
    for (const date in tasksByDay) {
        tasksByDay[date].forEach(task => {
            const cat = task.category || 'Other';
            tasksByCategory[cat] = (tasksByCategory[cat] || 0) + 1;
        });
    }
    
    // Tasks this month
    let monthTasks = 0;
    let monthCompleted = 0;
    for (const date in tasksByDay) {
        const taskDate = new Date(date + 'T00:00:00');
        if (taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear) {
            const tasks = tasksByDay[date];
            monthTasks += tasks.length;
            monthCompleted += tasks.filter(t => t.completed).length;
        }
    }
    
    // Calculate monthly completion rate
    const monthlyCompletionRate = monthTasks > 0 ? Math.round((monthCompleted / monthTasks) * 100) : 0;
    
    content.innerHTML = `
        <div class="analytics-container">
            <div class="analytics-main-layout">
                <div class="analytics-left">
                    <div class="analytics-section">
                        <h2>Completion Rate</h2>
                        <div class="progress-ring">
                            <svg class="progress-ring-svg" width="200" height="200">
                                <circle class="progress-ring-circle-bg" cx="100" cy="100" r="80"></circle>
                                <circle class="progress-ring-circle" cx="100" cy="100" r="80" 
                                        style="stroke-dasharray: ${2 * Math.PI * 80}; stroke-dashoffset: ${2 * Math.PI * 80 * (1 - completionRate / 100)};"></circle>
                            </svg>
                            <div class="progress-ring-text">
                                <span class="progress-ring-percentage">${completionRate}%</span>
                                <span class="progress-ring-label">Overall</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="analytics-section">
                        <h2>This Month</h2>
                        <div class="month-stats">
                            <div class="stat-item">
                                <span class="stat-value">${monthTasks}</span>
                                <span class="stat-label">Tasks</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${monthCompleted}</span>
                                <span class="stat-label">Completed</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${monthlyCompletionRate}%</span>
                                <span class="stat-label">Completion</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-value">${activeProjects}</span>
                                <span class="stat-label">Active Projects</span>
                            </div>
                        </div>
                    </div>
                    
                    ${Object.keys(tasksByCategory).length > 0 ? `
                    <div class="analytics-section">
                        <h2>Tasks by Category</h2>
                        <div class="category-stats">
                            ${Object.entries(tasksByCategory).map(([cat, count]) => `
                                <div class="category-item">
                                    <span class="category-name">${escapeHtml(cat)}</span>
                                    <span class="category-count">${count}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                
                <div class="analytics-right">
                    <div class="analytics-grid">
                        <div class="analytics-card">
                            <div class="analytics-icon" style="background: linear-gradient(135deg, #8B5CF6 0%, #6366F1 100%);">
                                <i class="fas fa-tasks"></i>
                            </div>
                            <div class="analytics-info">
                                <h3>${totalTasks}</h3>
                                <p>Total Tasks</p>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <div class="analytics-icon" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%);">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="analytics-info">
                                <h3>${completedTasks}</h3>
                                <p>Completed</p>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <div class="analytics-icon" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);">
                                <i class="fas fa-folder"></i>
                            </div>
                            <div class="analytics-info">
                                <h3>${totalProjects}</h3>
                                <p>Projects</p>
                            </div>
                        </div>
                        
                        <div class="analytics-card">
                            <div class="analytics-icon" style="background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);">
                                <i class="fas fa-sticky-note"></i>
                            </div>
                            <div class="analytics-info">
                                <h3>${totalNotes}</h3>
                                <p>Notes</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Render Profile/Settings View
function renderProfileView() {
    if (!profileView) return;
    const content = profileView.querySelector('.profile-view-content');
    if (!content) return;
    
    const t = translations[currentLang];
    const username = localStorage.getItem('username') || localStorage.getItem('userName') || 'User';
    
    content.innerHTML = `
        <div class="profile-container">
            <div class="profile-header">
                <div class="profile-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <h2>${escapeHtml(username)}</h2>
            </div>
            
            <div class="settings-section">
                <h3>Appearance</h3>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <i class="fas fa-palette"></i>
                        <span>Theme</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="dark-mode-toggle" ${isDarkMode ? 'checked' : ''}>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <i class="fas fa-paint-brush"></i>
                        <span>Main Color</span>
                    </div>
                    <div class="color-picker-wrapper">
                        <input type="color" id="main-color-picker" value="${getMainColor()}" class="color-picker-input">
                        <span class="color-preview" style="background: ${getMainColor()};"></span>
                    </div>
                </div>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <i class="fas fa-language"></i>
                        <span>Language</span>
                    </div>
                    <span class="settings-value">${currentLang === 'en' ? 'English' : 'العربية'}</span>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Account</h3>
                <div class="settings-item clickable" onclick="editUsername()">
                    <div class="settings-item-info">
                        <i class="fas fa-user-edit"></i>
                        <span>Edit Username</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="settings-item clickable" onclick="exportData()">
                    <div class="settings-item-info">
                        <i class="fas fa-download"></i>
                        <span>Export Data</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="settings-item clickable" onclick="importData()">
                    <div class="settings-item-info">
                        <i class="fas fa-upload"></i>
                        <span>Import Data</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Notifications</h3>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <i class="fas fa-bell"></i>
                        <span>Task Notifications</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="task-notifications-toggle" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <i class="fas fa-sticky-note"></i>
                        <span>Note Alarms</span>
                    </div>
                    <label class="toggle-switch">
                        <input type="checkbox" id="note-alarms-toggle" checked>
                        <span class="toggle-slider"></span>
                    </label>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>Data Management</h3>
                <div class="settings-item clickable" onclick="clearCompletedTasks()">
                    <div class="settings-item-info">
                        <i class="fas fa-trash-alt"></i>
                        <span>Clear Completed Tasks</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
                <div class="settings-item clickable danger-item" onclick="deleteAllData()">
                    <div class="settings-item-info">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span style="color: #EF4444;">Delete All Data</span>
                    </div>
                    <i class="fas fa-chevron-right"></i>
                </div>
            </div>
            
            <div class="settings-section">
                <h3>About</h3>
                <div class="settings-item">
                    <div class="settings-item-info">
                        <i class="fas fa-info-circle"></i>
                        <span>App Version</span>
                    </div>
                    <span class="settings-value">1.0.0</span>
                </div>
            </div>
        </div>
    `;
    
    // Setup dark mode toggle
    const darkModeToggle = content.querySelector('#dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', (e) => {
            if (e.target.checked !== isDarkMode) {
                toggleDarkMode();
            }
        });
    }
    
    // Setup main color picker
    const mainColorPicker = content.querySelector('#main-color-picker');
    if (mainColorPicker) {
        mainColorPicker.addEventListener('input', (e) => {
            setMainColor(e.target.value);
        });
        mainColorPicker.addEventListener('change', (e) => {
            setMainColor(e.target.value);
        });
    }
}

// Settings helper functions
function editUsername() {
    const currentUsername = localStorage.getItem('username') || localStorage.getItem('userName') || 'User';
    const newUsername = prompt('Enter new username:', currentUsername);
    if (newUsername && newUsername.trim()) {
        localStorage.setItem('username', newUsername.trim());
        localStorage.setItem('userName', newUsername.trim());
        renderProfileView();
        updateGreeting();
    }
}

function exportData() {
    const data = {
        tasks: tasksByDay,
        projects: projects,
        notes: notes,
        exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `todo-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (confirm('This will replace all your current data. Are you sure?')) {
                        if (data.tasks) tasksByDay = data.tasks;
                        if (data.projects) projects = data.projects;
                        if (data.notes) notes = data.notes;
                        // Save to backend
                        saveTasks();
                        saveProjects();
                        saveNotes();
                        renderDashboard();
                        alert('Data imported successfully!');
                    }
                } catch (error) {
                    alert('Error importing data: ' + error.message);
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function clearCompletedTasks() {
    if (confirm('Are you sure you want to clear all completed tasks?')) {
        for (const date in tasksByDay) {
            tasksByDay[date] = tasksByDay[date].filter(task => !task.completed);
            if (tasksByDay[date].length === 0) {
                delete tasksByDay[date];
            }
        }
        saveTasks();
        renderDashboard();
        alert('Completed tasks cleared!');
    }
}

function deleteAllData() {
    if (confirm('WARNING: This will delete ALL your data. This cannot be undone. Are you absolutely sure?')) {
        if (confirm('Last chance! This will delete everything. Continue?')) {
            tasksByDay = {};
            projects = [];
            notes = [];
            saveTasks();
            saveProjects();
            saveNotes();
            renderDashboard();
            alert('All data deleted.');
        }
    }
}

window.editUsername = editUsername;
window.exportData = exportData;
window.importData = importData;
window.clearCompletedTasks = clearCompletedTasks;
window.deleteAllData = deleteAllData;