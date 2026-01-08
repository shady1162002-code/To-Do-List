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
        notifications: 'Notifications',
        search: 'Search',
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
        notifications: 'الإشعارات',
        search: 'البحث',
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
let dashboardView, timelineView, taskModal, taskForm;
let todayTasks, taskList, dateSelector;
let viewTimelineBtn, backBtn, closeModal;
let addTaskBtnTimeline, navIcons;
let monthYearDisplay;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
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
        // Check if this is the note button
        if (btn.id === 'add-note-btn') {
            btn.innerHTML = icon ? `<i class="${icon.className}"></i> ${t.addNote}` : t.addNote;
        } else if (btn.id === 'add-project-btn') {
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
    
    dashboardView.classList.toggle('active', view === 'dashboard');
    timelineView.classList.toggle('active', view === 'timeline');
    
    // Update nav icons
    navIcons.forEach(icon => {
        icon.classList.toggle('active', icon.dataset.view === view);
    });
    
    if (view === 'timeline') {
        renderDateSelector();
        renderTimeline();
        updateMonthYear();
    } else {
        renderDashboard();
    }
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
    const centerDate = new Date(selectedDate + 'T00:00:00');
    const dates = [];
    
    // Generate dates from -3 to +3 days around the selected date
    for (let i = -3; i <= 3; i++) {
        const date = new Date(centerDate);
        date.setDate(centerDate.getDate() + i);
        dates.push(date);
    }
    
    const locale = currentLang === 'ar' ? 'ar-SA' : 'en-US';
    dateSelector.innerHTML = dates.map(date => {
        const dateStr = date.toISOString().split('T')[0];
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
    
    // Scroll the active date to the center
    setTimeout(() => {
        const activeItem = dateSelector.querySelector('.date-item.active');
        if (activeItem && dateSelector) {
            const containerWidth = dateSelector.offsetWidth;
            const itemWidth = activeItem.offsetWidth;
            const itemLeft = activeItem.offsetLeft;
            const scrollPosition = itemLeft - (containerWidth / 2) + (itemWidth / 2);
            
            dateSelector.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
        }
    }, 10);
}

function selectDate(date) {
    selectedDate = date;
    renderDateSelector();
    renderTimeline();
    updateDayProgress();
    updateMonthYear();
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
    const year = date.getFullYear();
    if (monthYearDisplay) {
        monthYearDisplay.textContent = `${month}, ${year}`;
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
        
        // Refresh the page to update UI
        window.location.reload();
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
    
    // Refresh the page to update UI
    window.location.reload();
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
        await addNote({ title, content, date, time });
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
        
        // Remove notification if time has passed
        if (noteTimeMinutes < currentTimeMinutes) {
            const notificationId = `note-${note.id}`;
            shownNoteNotifications.delete(notificationId);
        }
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

// Handle when a note's time is reached: show notification, delete note, and refresh page
async function handleNoteTimeReached(note) {
    // Show notification immediately
    await showNoteNotification(note);
    
    // Wait 2 seconds so user can see the notification, then delete note and refresh
    setTimeout(async () => {
        // Delete the note
        await deleteNoteAfterNotification(note.id);
        
        // Refresh the page to update UI
        window.location.reload();
    }, 2000);
}

function dismissNoteNotification(id) {
    const notification = document.getElementById(id);
    if (notification) {
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
        
        // Refresh the page to update UI immediately
        window.location.reload();
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