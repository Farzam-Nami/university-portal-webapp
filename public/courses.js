// Courses page functionality
let selectedSemester = null;
let currentCourses = [];

// JavaScript weekday mapping (0 = Sunday, 6 = Saturday).
const weekDays = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
};

// Time slots for weekly schedule
const timeSlots = [
    '8:00-10:00',
    '10:00-12:00',
    '13:00-15:00'
];

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadSemesters();
    // Normalize any non-Western digits after dynamic content has loaded
    setTimeout(convertAllNumbersToEnglish, 100);
});

// Load all available semesters
async function loadSemesters() {
    try {
        const response = await fetch('/api/courses/semesters');
        if (!response.ok) {
            throw new Error('Failed to fetch semesters');
        }
        
        const data = await response.json();
        populateSemesterDropdown(data.semesters);
        
        // Load current semester by default (last semester in the list)
        if (data.semesters.length > 0) {
            const currentSemester = data.semesters[data.semesters.length - 1];
            document.getElementById('semesterSelect').value = currentSemester;
            selectedSemester = currentSemester;
            loadCoursesBySemester(currentSemester);
        }
    } catch (error) {
        console.error('Error loading semesters:', error);
        showError('Failed to load the semester list.');
    }
}

// Populate semester dropdown
function populateSemesterDropdown(semesters) {
    const select = document.getElementById('semesterSelect');
    select.innerHTML = '<option value="">Select Semester...</option>';
    
    semesters.forEach(semester => {
        const option = document.createElement('option');
        option.value = semester;
        option.textContent = toEnglishNumerals(semester);
        select.appendChild(option);
    });
}

// Handle semester selection change
function onSemesterChange() {
    const select = document.getElementById('semesterSelect');
    selectedSemester = select.value;
    
    if (selectedSemester) {
        loadCoursesBySemester(selectedSemester);
    } else {
        clearCoursesTable();
        clearWeeklySchedule();
    }
}

// Load courses for selected semester
async function loadCoursesBySemester(semester) {
    try {
        const response = await fetch(`/api/courses/semester/${encodeURIComponent(semester)}`);
        if (!response.ok) {
            throw new Error('Failed to fetch courses');
        }
        
        const data = await response.json();
        currentCourses = data.courses;
        
        populateCoursesTable(data.courses);
        generateWeeklySchedule(data.courses);
        updateSemesterInfo(semester, data.courses);
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load semester courses.');
    }
}

// Populate courses table
function populateCoursesTable(courses) {
    const tbody = document.querySelector('.courses-table tbody');
    tbody.innerHTML = '';
    
    if (courses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No courses were found for this semester.</td></tr>';
        return;
    }
    
    courses.forEach(course => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${course.name}</td>
            <td>${course.professor}</td>
            <td>${toEnglishNumerals(course.units)}</td>
            <td>${toEnglishNumerals(course.classTime)}</td>
            <td>${toEnglishNumerals(course.examDate)}</td>
            <td>${course.score !== null ? toEnglishNumerals(course.score) : '-'}</td>
        `;
        tbody.appendChild(row);
    });
}

// Generate weekly schedule
function generateWeeklySchedule(courses) {
    const tbody = document.querySelector('.schedule-table tbody');
    tbody.innerHTML = '';
    
    // Create schedule grid
    const schedule = {};
    timeSlots.forEach(timeSlot => {
        schedule[timeSlot] = {};
        Object.keys(weekDays).forEach(day => {
            schedule[timeSlot][day] = null;
        });
    });
    
    // Parse courses and place them in schedule
    courses.forEach(course => {
        if (course.classTime && course.classTime !== '-') {
            const sessions = parseClassTime(course.classTime);
            sessions.forEach(session => {
                const timeSlot = findTimeSlot(session.time);
                if (timeSlot && schedule[timeSlot] && schedule[timeSlot][session.day] === null) {
                    schedule[timeSlot][session.day] = {
                        name: course.name,
                        time: session.time
                    };
                }
            });
        }
    });
    
    // Generate HTML table rows
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="time-slot">${toEnglishNumerals(timeSlot)}</td>`;
        
        Object.keys(weekDays).forEach(day => {
            const cell = document.createElement('td');
            if (schedule[timeSlot][day]) {
                cell.className = 'course-slot';
                cell.innerHTML = `${schedule[timeSlot][day].name}<br><small>${toEnglishNumerals(schedule[timeSlot][day].time)}</small>`;
            }
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
}

// Parse class time string
function parseClassTime(classTime) {
    const sessions = [];
    const parts = classTime.split(',').map(part => part.trim());
    
    parts.forEach(part => {
        const dayTimeMatch = part.match(/(\S+)\s+(\d{1,2}:\d{2}-\d{1,2}:\d{2})/);
        if (dayTimeMatch) {
            sessions.push({
                day: dayTimeMatch[1],
                time: dayTimeMatch[2]
            });
        }
    });
    
    return sessions;
}

// Find appropriate time slot for a given time
function findTimeSlot(time) {
    const startTime = time.split('-')[0];
    const [hours, minutes] = startTime.split(':').map(Number);
    const timeInMinutes = hours * 60 + minutes;
    
    if (timeInMinutes >= 8 * 60 && timeInMinutes < 10 * 60) {
        return '8:00-10:00';
    } else if (timeInMinutes >= 10 * 60 && timeInMinutes < 12 * 60) {
        return '10:00-12:00';
    } else if (timeInMinutes >= 13 * 60 && timeInMinutes < 15 * 60) {
        return '13:00-15:00';
    }
    
    return null;
}

// Update semester info
function updateSemesterInfo(semester, courses) {
    document.getElementById('currentSemester').textContent = toEnglishNumerals(semester);
    
    // Calculate total units
    const totalUnits = courses.reduce((sum, course) => sum + (course.units || 0), 0);
    document.getElementById('totalUnits').textContent = toEnglishNumerals(totalUnits);
    
    // Update other info as needed
    // You can add semester start/end dates based on semester name
}

// Clear courses table
function clearCoursesTable() {
    const tbody = document.querySelector('.courses-table tbody');
    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Please select a semester.</td></tr>';
}

// Clear weekly schedule
function clearWeeklySchedule() {
    const tbody = document.querySelector('.schedule-table tbody');
    tbody.innerHTML = '';
    
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        row.innerHTML = `<td class="time-slot">${toEnglishNumerals(timeSlot)}</td><td></td><td></td><td></td><td></td><td></td><td></td>`;
        tbody.appendChild(row);
    });
}

// Show error message
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #f8d7da;
        border: 1px solid #f5c6cb;
        color: #721c24;
        padding: 12px;
        border-radius: 4px;
        margin: 10px 0;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    const container = document.querySelector('.main-content');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 5000);
}

// Convert Persian and Arabic-Indic digits to Western digits.
function toEnglishNumerals(value) {
    return String(value).replace(/[\u06F0-\u06F9\u0660-\u0669]/g, digit => {
        const code = digit.charCodeAt(0);
        return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
    });
}

// Convert all numbers in the page to Western digits
function convertAllNumbersToEnglish() {
    // Convert numbers in course table, semester info, and schedule
    const elementsToConvert = document.querySelectorAll('td, #totalUnits, .time-slot, .course-slot');
    
    elementsToConvert.forEach(element => {
        if (element.textContent && element.textContent.match(/[0-9]/)) {
            element.textContent = toEnglishNumerals(element.textContent);
        }
    });
    
    // Convert semester dropdown options
    const semesterOptions = document.querySelectorAll('#semesterSelect option');
    semesterOptions.forEach(option => {
        if (option.textContent && option.textContent.match(/[0-9]/)) {
            option.textContent = toEnglishNumerals(option.textContent);
        }
    });
}

// Make functions available globally
window.onSemesterChange = onSemesterChange;