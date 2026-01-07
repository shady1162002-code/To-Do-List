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
        tasksThisMonth: 'tasks this month',
        todayTasks: "Today's Tasks",
        addTask: 'Add Task',
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
        todayTasks: 'مهام اليوم',
        addTask: 'إضافة مهمة',
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
        btn.innerHTML = icon ? `<i class="${icon.className}"></i> ${t.addTask}` : t.addTask;
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
        greetingEl.textContent = `${greeting}, ${userName}!`;
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
async function addTask(taskData) {
    console.log('addTask called with:', taskData);
    
    try {
        const { date, title, description, startTime, endTime, category } = taskData;
        
        if (!date || !title) {
            console.error('Missing required fields:', { date, title });
            alert('Please fill in all required fields');
            return;
        }
        
        if (!tasksByDay[date]) {
            tasksByDay[date] = [];
        }
        
        // Validate startTime and endTime
        if (!startTime || !endTime) {
            console.error('Missing time fields:', { startTime, endTime });
            alert('Please fill in both start time and end time');
            return;
        }
        
        const task = {
            id: editingTaskId || Date.now(),
            title: title.trim(),
            description: (description || '').trim(),
            startTime: startTime || '09:00',
            endTime: endTime || '10:00',
            category: category || selectedCategory,
            completed: false // New tasks start as not completed
        };
        
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
        
        // Refresh the page to update UI
        window.location.reload();
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Error adding task: ' + error.message);
    }
}

async function deleteTask(date, id) {
    if (tasksByDay[date]) {
        tasksByDay[date] = tasksByDay[date].filter(task => task.id !== id);
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
    
    console.log('Adding task:', { date, title, description, startTime, endTime, category: selectedCategory });
    
    await addTask({ date, title, description, startTime, endTime, category: selectedCategory });
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
    
    return `
        <div class="task-card ${completedClass}" onclick="editTask('${date}', ${task.id})">
            <button class="complete-task-btn" onclick="event.stopPropagation(); toggleTaskCompleted('${date}', ${task.id})" title="${task.completed ? (currentLang === 'ar' ? 'إلغاء الإكمال' : 'Mark as incomplete') : (currentLang === 'ar' ? 'تمييز كمكتمل' : 'Mark as complete')}">
                <i class="fas ${checkIcon}"></i>
            </button>
            <div class="task-icon">
                <i class="fas fa-tasks"></i>
            </div>
            <div class="task-info">
                <div class="task-title">${escapeHtml(task.title)}</div>
                <div class="task-date">${timeRange} • ${relativeDate}</div>
            </div>
            <div class="task-actions">
                <button class="delete-task-btn" onclick="event.stopPropagation(); deleteTask('${date}', ${task.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
}

function renderDateSelector() {
    const today = new Date();
    const dates = [];
    
    for (let i = -3; i <= 3; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
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
    
    return `
        <div class="task-list-item ${completedClass}" onclick="editTask('${date}', ${task.id})">
            <button class="complete-task-btn" onclick="event.stopPropagation(); toggleTaskCompleted('${date}', ${task.id})" title="${task.completed ? (currentLang === 'ar' ? 'إلغاء الإكمال' : 'Mark as incomplete') : (currentLang === 'ar' ? 'تمييز كمكتمل' : 'Mark as complete')}">
                <i class="fas ${checkIcon}"></i>
            </button>
            <div class="task-list-icon">
                <i class="fas fa-tasks"></i>
            </div>
            <div class="task-list-info">
                <div class="task-list-title">${escapeHtml(task.title)}</div>
                <div class="task-list-date">${relativeDate}</div>
            </div>
            <div class="task-actions">
                <button class="delete-task-btn" onclick="event.stopPropagation(); deleteTask('${date}', ${task.id})">
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
    if (confirm(currentLang === 'ar' ? 'هل أنت متأكد من حذف هذه الملاحظة؟' : 'Are you sure you want to delete this note?')) {
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
    
    // Show/hide tab content
    const tasksContent = document.getElementById('tasks-tab-content');
    const projectsContent = document.getElementById('projects-tab-content');
    const notesContent = document.getElementById('notes-tab-content');
    
    if (tasksContent) tasksContent.classList.toggle('active', tabName === 'tasks');
    if (projectsContent) projectsContent.classList.toggle('active', tabName === 'projects');
    if (notesContent) {
        notesContent.classList.toggle('active', tabName === 'notes');
        if (tabName === 'notes') {
            renderNotes();
        }
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
            titleInput.value = '';
            contentInput.value = '';
            dateInput.value = today;
            timeInput.value = '12:00';
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
    
    await addNote({ title, content, date, time });
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
            
            if (!shownNoteNotifications.has(notificationId)) {
                showNoteNotification(note);
                shownNoteNotifications.add(notificationId);
            }
        }
        
        // Remove notification if time has passed
        if (noteTimeMinutes < currentTimeMinutes) {
            const notificationId = `note-${note.id}`;
            shownNoteNotifications.delete(notificationId);
        }
    });
}

function showNoteNotification(note) {
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
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
        dismissNoteNotification(notificationId);
    }, 10000);
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
    // Check every minute
    if (noteNotificationInterval) {
        clearInterval(noteNotificationInterval);
    }
    noteNotificationInterval = setInterval(checkNoteNotifications, 60000);
    // Also check immediately
    checkNoteNotifications();
}

// Make functions globally available
window.selectDate = selectDate;
window.deleteTask = deleteTask;
window.editTask = editTask;
window.toggleTaskCompleted = toggleTaskCompleted;
window.deleteNote = deleteNote;
window.editNote = editNote;
window.dismissNoteNotification = dismissNoteNotification;