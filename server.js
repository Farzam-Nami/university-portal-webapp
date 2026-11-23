const http = require('http'); 
const fs = require('fs'); 
const path = require('path');
const crypto = require('crypto');
const { connectToDatabase, getCurrentSemesterCourses, getAllCourses, getCoursesBySemester, getAllSemesters, getScoresBySemester, getTodaysCourses, getUserProfile, updateUserProfile, updateUserPassword, validateUserPassword, getUserBalance, updateUserBalance, initializeFoodMenu, getFoodMenu, makeReservation, getUserReservations, cancelReservation, editReservation, checkExistingReservation, getUserDebt, updateUserDebt, settleDebt, createRequest, getUserRequests, getRequestById, updateRequestStatus } = require('./db');
const bcrypt = require('bcrypt');
const cookie = require('cookie');
const sessions = {};

function toEnglishNumerals(value) {
    return String(value).replace(/[\u06F0-\u06F9\u0660-\u0669]/g, digit => {
        const code = digit.charCodeAt(0);
        return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
    });
}

function safeJson(value) {
    return JSON.stringify(value ?? '')
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[character]));
}


// Helper function to inject user info into sidebar
async function injectUserInfoIntoSidebar(htmlContent, username) {
    try {
        if (!username) return htmlContent;
        
        const userProfile = await getUserProfile(username);
        if (!userProfile) return htmlContent;
        
        const firstName = userProfile.firstName || '';
        const lastName = userProfile.lastName || '';
        const email = userProfile.email || '';
        const displayName = `${firstName} ${lastName}`.trim() || userProfile.username;
        
        // Replace AppName with Educational System
        let modifiedHtml = htmlContent.replace(
            '<div class="sidebar-logo">AppName</div>',
            `<div class="sidebar-logo">University Portal</div>
                <div class="user-info-box">
                    <div class="user-name">${escapeHtml(displayName)}</div>
                    <div class="user-email">${escapeHtml(email)}</div>
                </div>`
        );
        
        return modifiedHtml;
    } catch (err) {
        console.error('Error injecting user info:', err);
        return htmlContent;
    }
} 

// Initialize food menu
initializeFoodMenu().catch(console.error);



const server = http.createServer((req, res) => {
    if (req.url === '/' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'index.html'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(data); 
            } 
        }); 
    }
    // Login page route 
    else if (req.url === '/login' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'login.html'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(data); 
            } 
        }); 
    }




    else if (req.url === '/profile' && req.method === 'GET') { 
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }

        (async () => {
            try {
                // Get user profile data from database
                const userProfile = await getUserProfile(session.username);
            
            if (!userProfile) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('User profile not found');
                return;
            }
// Read the profile template
            const filePath = path.join(__dirname, 'public', 'profile.html');
            fs.readFile(filePath, 'utf8', async (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                } else {
                    // Replace placeholders with actual user data
                    let modifiedHtml = data;
                    
                    // Create avatar initials
                    const firstName = userProfile.firstName || '';
                    const lastName = userProfile.lastName || '';
                    const avatarInitials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase() || userProfile.username.charAt(0).toUpperCase();
                    
                    // Format display name
                    const displayName = `${firstName} ${lastName}`.trim() || userProfile.username;
                    
                    // Format student info
                    const studentInfo = `${userProfile.major || 'Not specified'} - ${userProfile.faculty || 'Not specified'}`;
                    
                    // Format membership date
                    const memberSince = userProfile.createdAt ? 
                        new Date(userProfile.createdAt).toLocaleDateString('en-US') : 'Not specified';
                    
                    // Replace all placeholders
                    modifiedHtml = modifiedHtml.replace('<!-- AVATAR_PLACEHOLDER -->', escapeHtml(avatarInitials));
                    modifiedHtml = modifiedHtml.replace('<!-- DISPLAY_NAME_PLACEHOLDER -->', escapeHtml(displayName));
                    modifiedHtml = modifiedHtml.replace('<!-- STUDENT_INFO_PLACEHOLDER -->', escapeHtml(studentInfo));
                    modifiedHtml = modifiedHtml.replace('<!-- MEMBER_SINCE_PLACEHOLDER -->', toEnglishNumerals(memberSince));
                    
                    // Read-only fields
                    modifiedHtml = modifiedHtml.replace('<!-- STUDENT_ID_PLACEHOLDER -->', escapeHtml(toEnglishNumerals(userProfile.studentId || 'Not specified')));
                    modifiedHtml = modifiedHtml.replace('<!-- USERNAME_PLACEHOLDER -->', escapeHtml(userProfile.username));
                    modifiedHtml = modifiedHtml.replace('<!-- MAJOR_PLACEHOLDER -->', escapeHtml(userProfile.major || 'Not specified'));
                    modifiedHtml = modifiedHtml.replace('<!-- FACULTY_PLACEHOLDER -->', escapeHtml(userProfile.faculty || 'Not specified'));
                    
                    // Set form field values using JavaScript injection
                    const jsInjection = `
                    <script>
                    window.addEventListener('DOMContentLoaded', function() {
                        document.getElementById('nationalId').value = ${safeJson(userProfile.nationalId || '')};
                        document.getElementById('firstName').value = ${safeJson(userProfile.firstName || '')};
                        document.getElementById('lastName').value = ${safeJson(userProfile.lastName || '')};
                        document.getElementById('email').value = ${safeJson(userProfile.email || '')};
                        document.getElementById('birthDate').value = ${safeJson(toEnglishNumerals(userProfile.birthDate || ''))};
                    });
                    </script>
                    `;
                    
                    // Insert the script before closing body tag
                    modifiedHtml = modifiedHtml.replace('</body>', jsInjection + '</body>');
                    
                    // Inject user info into sidebar
                    modifiedHtml = await injectUserInfoIntoSidebar(modifiedHtml, session.username);
                    
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(modifiedHtml);
                }
            });
        } catch (err) {
            console.error('Error loading profile:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error loading profile data');
        }
        })(); // Close async function
    }
    // API endpoint for profile updates
    else if (req.url === '/api/profile' && req.method === 'PUT') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const profileData = JSON.parse(body);
                
                // Update user profile in database
                const success = await updateUserProfile(session.username, {
                    ...profileData,
                    updatedAt: new Date()
                });
                
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Information updated successfully.' }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to update information.' }));
                }
            } catch (err) {
                console.error('Profile update error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to process the request.' }));
            }
        });
    }
    // API endpoint for password changes
    else if (req.url === '/api/password' && req.method === 'PUT') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { currentPassword, newPassword } = JSON.parse(body);
                
                // Validate current password
                const db = await connectToDatabase();
                const usersCollection = db.collection('users');
                const user = await usersCollection.findOne({ username: session.username });
                
                if (!user) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'User not found.' }));
                    return;
                }
                
                const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
                
                if (!isCurrentPasswordValid) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'The current password is incorrect.' }));
                    return;
                }
                
                // Hash new password and update
                const hashedNewPassword = await bcrypt.hash(newPassword, 10);
                const success = await updateUserPassword(session.username, hashedNewPassword);
                
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Password changed successfully.' }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to change password.' }));
                }
            } catch (err) {
                console.error('Password change error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to process the request.' }));
            }
        });
    }
    else if (req.url === '/food-reservation' && req.method === 'GET') { 
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
        
        const filePath = path.join(__dirname, 'public', 'food-reservation.html'); 
        fs.readFile(filePath, 'utf8', async (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else {
                // Inject user info into sidebar
                const modifiedHtml = await injectUserInfoIntoSidebar(data, session.username);
                
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(modifiedHtml); 
            } 
        }); 
    }
    else if (req.url === '/news' && req.method === 'GET') { 
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
        
        const filePath = path.join(__dirname, 'public', 'news.html'); 
        fs.readFile(filePath, 'utf8', async (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else {
                // Inject user info into sidebar
                const modifiedHtml = await injectUserInfoIntoSidebar(data, session.username);
                
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(modifiedHtml); 
            } 
        }); 
    }
    // News detail page
    else if (req.url.startsWith('/news-detail') && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
        
        const filePath = path.join(__dirname, 'public', 'news-detail.html'); 
        fs.readFile(filePath, 'utf8', async (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else {
                // Inject user info into sidebar
                const modifiedHtml = await injectUserInfoIntoSidebar(data, session.username);
                
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(modifiedHtml); 
            } 
        }); 
    }
    else if (req.url === '/requests' && req.method === 'GET') { 
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
        
        const filePath = path.join(__dirname, 'public', 'requests.html'); 
        fs.readFile(filePath, 'utf8', async (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else {
                // Inject user info into sidebar
                const modifiedHtml = await injectUserInfoIntoSidebar(data, session.username);
                
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(modifiedHtml); 
            } 
        }); 
    }
    else if (req.url === '/courses' && req.method === 'GET') { 
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
        
        // Get courses data from database
        const { getCurrentSemesterCourses } = require('./db');
        getCurrentSemesterCourses().then(courses => {
            // Read the courses.html template
            const filePath = path.join(__dirname, 'public', 'courses.html'); 
            fs.readFile(filePath, 'utf8', async (err, data) => { 
                if (err) { 
                    res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                    res.end('Internal Server Error'); 
                } else {
                    // Generate the courses table HTML
                    let coursesTableHtml = '';
                    courses.forEach(course => {
                        coursesTableHtml += `
                        <tr>
                            <td>${escapeHtml(course.name)}</td>
                            <td>${escapeHtml(course.professor)}</td>
                            <td>${course.units}</td>
                            <td>${course.classTime}</td>
                            <td>${course.examDate}</td>
                            <td>${course.score !== null ? course.score : '-'}</td>
                        </tr>`;
                    });
                    
                    // Replace the placeholder in the HTML template
                    let modifiedHtml = data.replace('<!-- COURSES_TABLE_PLACEHOLDER -->', coursesTableHtml);
                    
                    // Inject user info into sidebar
                    modifiedHtml = await injectUserInfoIntoSidebar(modifiedHtml, session.username);
                    
                    res.writeHead(200, { 'Content-Type': 'text/html' }); 
                    res.end(modifiedHtml); 
                } 
            }); 
        }).catch(err => {
            console.error('Error fetching courses:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching course data');
        });
    }
    else if (req.url === '/financial' && req.method === 'GET') { 
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
        
        const filePath = path.join(__dirname, 'public', 'financial.html'); 
        fs.readFile(filePath, 'utf8', async (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else {
                // Inject user info into sidebar
                const modifiedHtml = await injectUserInfoIntoSidebar(data, session.username);
                
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(modifiedHtml); 
            } 
        }); 
    }





    // Registration page route 
    else if (req.url === '/signup' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'signup.html'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'text/html' }); 
                res.end(data); 
            } 
        }); 
    }
    

    else if (req.url === '/check-session') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ loggedIn: !!session }));
    }

    else if (req.url === '/logout') {
        const cookies = cookie.parse(req.headers.cookie || '');
        delete sessions[cookies.session];
        res.writeHead(302, {
            'Set-Cookie': `session=; Max-Age=0; HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
            'Location': '/login'
        });
        res.end();
    }

    else if (req.url === '/styles.css' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'styles.css'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'text/css' }); 
                res.end(data); 
            } 
        }); 
    }
    else if (req.url === '/sidebar.js' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'sidebar.js'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'application/javascript' }); 
                res.end(data); 
            } 
        }); 
    }
    else if (req.url === '/food-reservation.js' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'food-reservation.js'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'application/javascript' }); 
                res.end(data); 
            } 
        }); 
    }
    else if (req.url === '/courses.js' && req.method === 'GET') { 
        const filePath = path.join(__dirname, 'public', 'courses.js'); 
        fs.readFile(filePath, (err, data) => { 
            if (err) { 
                res.writeHead(500, { 'Content-Type': 'text/plain' }); 
                res.end('Internal Server Error'); 
            } else { 
                res.writeHead(200, { 'Content-Type': 'application/javascript' }); 
                res.end(data); 
            } 
        }); 
    }
    else if (req.url === '/signup' && req.method === 'POST') {
        let body = ''; 
        req.on('data', chunk => { 
            body += chunk.toString(); 
        }); 
        req.on('end', async () => { 
            try { 
                const { 
                    username, 
                    email, 
                    password, 
                    studentId, 
                    major, 
                    faculty, 
                    nationalId, 
                    firstName, 
                    lastName, 
                    birthDate 
                } = JSON.parse(body); 
                
                const db = await connectToDatabase(); 
                const usersCollection = db.collection('users');
                
                // Check for existing user by username, email, or student ID
                const existingUser = await usersCollection.findOne({
                    $or: [{ username }, { email }, { studentId }]
                });
                
                if (existingUser) {
                    let message = 'User already exists';
                    if (existingUser.username === username) message = 'Username is already in use.';
                    else if (existingUser.email === email) message = 'Email is already in use.';
                    else if (existingUser.studentId === studentId) message = 'Student ID is already in use.';
                    
                    res.writeHead(409, { 'Content-Type': 'application/json' }); // 409 Conflict
                    res.end(JSON.stringify({ message }));
                    return;
                }
                
                // Hash password
                const hashedPassword = await bcrypt.hash(password, 10);

                // Create complete user profile
                const newUser = { 
                    username, 
                    email, 
                    password: hashedPassword,
                    // Read-only fields (set during registration, not changeable)
                    studentId,
                    major,
                    faculty,
                    // Editable fields
                    nationalId,
                    firstName,
                    lastName,
                    birthDate,
                    // Registration metadata
                    createdAt: new Date(),
                    updatedAt: new Date()
                };  
                
                const result = await usersCollection.insertOne(newUser); 
                res.writeHead(201, { 'Content-Type': 'application/json' }); 
                res.end(JSON.stringify({ message: 'Registration completed successfully.', userId: result.insertedId })); 
                
            } catch (err) { 
                console.error('Registration error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' }); 
                res.end(JSON.stringify({ message: 'Registration failed.', error: err.message })); 
            }
        });
        }   
    else if (req.url.endsWith('.jpg') && req.method === 'GET') {
        const imageName = path.basename(new URL(req.url, 'http://localhost').pathname);
        const filePath = path.join(__dirname, 'public', imageName);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Image Not Found');
            } else {
                const ext = path.extname(filePath).toLowerCase();
                const mimeTypes = {
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.png': 'image/png',
                    '.gif': 'image/gif',
                    '.svg': 'image/svg+xml'
                };
                res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
                res.end(data);
            }
        });
    }
    else if (req.url === '/login' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { username, password } = JSON.parse(body);
    
                const db = await connectToDatabase();
                const usersCollection = db.collection('users');
                
                
                const user = await usersCollection.findOne({ username });
                
                if (!user) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Username not found' }));
                    return;
                }
                const isPasswordValid = await bcrypt.compare(password, user.password);
                
                if (!isPasswordValid) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Incorrect password' }));
                    return;
                }
                const sessionId = crypto.randomBytes(32).toString('hex');
                sessions[sessionId] = { username: user.username };

                res.writeHead(200, {
                    'Set-Cookie': `session=${sessionId}; HttpOnly; SameSite=Lax; Path=/${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`,
                    'Content-Type': 'application/json'
                });
                res.end(JSON.stringify({ message: 'Login successful' }));

    
            } catch (err) {
                console.error('Login error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    error: 'Login failed',
                    details: 'Please try again later.'
                }));
            }
        });
    }
    
    
    else if (req.url === '/dashboard' && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(302, { 'Location': '/login' });
            return res.end();
        }
// Get data for the dashboard
        const { getCurrentSemesterCourses, getScoresBySemester, getTodaysCourses } = require('./db');
        
        Promise.all([
            getCurrentSemesterCourses(),
            getScoresBySemester(),
            getTodaysCourses(),
            getUserProfile(session.username)
        ]).then(([courses, semesterScores, todaysCourses, userProfile]) => {
            // Find the earliest exam
            let earliestExam = null;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            courses.forEach(course => {
                if (course.examDate && course.examDate !== '-') {
                    const examDate = new Date(`${course.examDate}T00:00:00`);

                    if (Number.isNaN(examDate.getTime())) {
                        return;
                    }

                    const daysLeft = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));

                    if (daysLeft > 0 && (!earliestExam || daysLeft < earliestExam.daysLeft)) {
                        earliestExam = {
                            course: course.name,
                            formattedDate: examDate.toLocaleDateString('en-US'),
                            daysLeft
                        };
                    }
                }
            });

            // Read the dashboard template
            const filePath = path.join(__dirname, 'public', 'dashboard.html');
            fs.readFile(filePath, 'utf8', async (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Internal Server Error');
                } else {
                    // Generate scores chart HTML
                    let scoresChartHtml = '';
                    semesterScores.forEach(sem => {
                        const height = Math.min(Math.max(parseFloat(sem.average) * 5, 30), 90); // Convert average to percentage height (min 30%, max 90%)
                        scoresChartHtml += `
                        <div class="chart-bar" style="height: ${height}%;">
                            <div class="bar-value">${toEnglishNumerals(sem.average)}</div>
                            <div class="bar-label">${escapeHtml(sem.shortName)}</div>
                        </div>`;
                    });

                    // Generate today's courses HTML
                    let todaysCoursesHtml = '';
                    if (todaysCourses.length > 0) {
                        todaysCourses.forEach(course => {
                            todaysCoursesHtml += `
                            <div class="today-course-item">
                                <div class="course-name">${escapeHtml(course.name)}</div>
                                <div class="course-time">${toEnglishNumerals(course.time)}</div>
                                <div class="course-professor">${escapeHtml(course.professor)}</div>
                            </div>`;
                        });
                    } else {
                        todaysCoursesHtml = '<div class="no-courses-today">You have no classes today.</div>';
                    }

                    // Calculate overall average
                    const allScores = semesterScores.map(s => parseFloat(s.average));
                    const overallAvg = allScores.length > 0 ? 
                        (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2) : '-';
                    const highestScore = allScores.length > 0 ? Math.max(...allScores).toFixed(2) : '-';

                    // Replace the placeholders in the HTML template
                    let modifiedHtml = data;
                    
                    // Replace countdown placeholder
                    if (earliestExam) {
                        const countdownHtml = `
                        <div class="countdown-container">
                            <div class="countdown-value">${toEnglishNumerals(earliestExam.daysLeft)}</div>
                            <div class="countdown-label">Days</div>
                        </div>
                        <div class="exam-info">
                            <p>Next Exam: ${escapeHtml(earliestExam.course)}</p>
                            <p>Date: ${escapeHtml(toEnglishNumerals(earliestExam.formattedDate))}</p>
                        </div>
                        <div class="progress-bar">
                            <div class="progress" style="width: ${Math.min(100 - (earliestExam.daysLeft / 120) * 100, 100)}%;"></div>
                        </div>`;
                        
                        modifiedHtml = modifiedHtml.replace('<!-- EXAM_COUNTDOWN_PLACEHOLDER -->', countdownHtml);
                    }
                    
                    // Replace scores chart placeholder
                    modifiedHtml = modifiedHtml.replace('<!-- SCORES_CHART_PLACEHOLDER -->', scoresChartHtml);
                    
                    // Replace today's courses placeholder
                    modifiedHtml = modifiedHtml.replace('<!-- TODAY_COURSES_PLACEHOLDER -->', todaysCoursesHtml);
                    
                    // Replace summary placeholders
                    modifiedHtml = modifiedHtml.replace('<!-- OVERALL_AVG_PLACEHOLDER -->', toEnglishNumerals(overallAvg));
                    modifiedHtml = modifiedHtml.replace('<!-- HIGHEST_SCORE_PLACEHOLDER -->', toEnglishNumerals(highestScore));
                    
                    // Replace welcome name if available
                    if (session.username && userProfile && userProfile.firstName) {
                        modifiedHtml = modifiedHtml.replace('<!-- WEllCOMENAME_PLACEHOLDER -->', escapeHtml(userProfile.firstName + ' ' + (userProfile.lastName || '')));
                    }
                    
                    // Inject user info into sidebar
                    modifiedHtml = await injectUserInfoIntoSidebar(modifiedHtml, session.username);
                    
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(modifiedHtml);
                }
            });
        }).catch(err => {
            console.error('Error preparing dashboard data:', err);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error preparing dashboard data');
        });
    }
    // FoodReservation route
    // ========== FOOD RESERVATION API ENDPOINTS ==========
    
    // Get user balance
    else if (req.url === '/api/food/balance' && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        (async () => {
            try {
                const balance = await getUserBalance(session.username);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ balance }));
            } catch (error) {
                console.error('Error getting user balance:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load account balance.' }));
            }
        })();
    }
    
    // Increase balance
    else if (req.url === '/api/food/increase-balance' && req.method === 'POST') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { amount, paymentMethod } = JSON.parse(body);
                
                if (!amount || amount < 1000) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'The amount must be at least 1,000 Toman.' }));
                    return;
                }
                
                // Simulate payment processing (in real app, integrate with payment gateway)
                const success = await updateUserBalance(session.username, amount);
                
                if (success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Balance updated successfully.', amount }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to add funds.' }));
                }
            } catch (error) {
                console.error('Error increasing balance:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to process the request.' }));
            }
        });
    }
    
    // Make reservation
    else if (req.url === '/api/food/reserve' && req.method === 'POST') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const reservationData = JSON.parse(body);
                
                // Validate reservation data
                if (!reservationData.cafeteria || !reservationData.date || 
                    !reservationData.mealType || !reservationData.foodName || 
                    !reservationData.price) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Reservation information is incomplete.' }));
                    return;
                }
                
                // Check if date is not in the past
                const reservationDate = new Date(reservationData.date);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (reservationDate < today) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Reservations cannot be made for past dates.' }));
                    return;
                }
                
                const result = await makeReservation(session.username, reservationData);
                
                if (result.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                }
            } catch (error) {
                console.error('Error making reservation:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to create the reservation.' }));
            }
        });
    }
    
    // Get user reservations
    else if (req.url === '/api/food/reservations' && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        (async () => {
            try {
                const reservations = await getUserReservations(session.username);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reservations }));
            } catch (error) {
                console.error('Error getting reservations:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load reservations.' }));
            }
        })();
    }
    
    // Cancel reservation
    else if (req.url === '/api/food/cancel' && req.method === 'DELETE') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { reservationId } = JSON.parse(body);
                
                if (!reservationId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Reservation ID was not provided.' }));
                    return;
                }
                
                const result = await cancelReservation(session.username, reservationId);
                
                if (result.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                }
            } catch (error) {
                console.error('Error cancelling reservation:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to cancel the reservation.' }));
            }
        });
    }
    
    // Edit reservation
    else if (req.url === '/api/food/edit' && req.method === 'PUT') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { reservationId, ...newReservationData } = JSON.parse(body);
                
                if (!reservationId) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Reservation ID was not provided.' }));
                    return;
                }
                
                // Validate new reservation data
                if (!newReservationData.cafeteria || !newReservationData.mealType || 
                    !newReservationData.foodName || !newReservationData.price) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'The new reservation information is incomplete.' }));
                    return;
                }
                
                const result = await editReservation(session.username, reservationId, newReservationData);
                
                if (result.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                }
            } catch (error) {
                console.error('Error editing reservation:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to update the reservation.' }));
            }
        });
    }
    
    // Check existing reservation
    else if (req.url.startsWith('/api/food/check-reservation') && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        const urlParts = req.url.split('?');
        const queryParams = new URLSearchParams(urlParts[1]);
        const date = queryParams.get('date');
        const mealType = queryParams.get('mealType');
        
        if (!date || !mealType) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Required query parameters are missing.' }));
            return;
        }

        (async () => {
            try {
                const hasReservation = await checkExistingReservation(session.username, date, mealType);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ hasReservation }));
            } catch (error) {
                console.error('Error checking reservation:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to check the reservation.' }));
            }
        })();
    }
    
    // ========== COURSES API ENDPOINTS ==========
    
    // Get all semesters
    else if (req.url === '/api/courses/semesters' && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        (async () => {
            try {
                const semesters = await getAllSemesters();
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ semesters }));
            } catch (error) {
                console.error('Error getting semesters:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load the semester list.' }));
            }
        })();
    }
    
    // Get courses by semester
    else if (req.url.startsWith('/api/courses/semester/') && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        // Extract semester from URL
        const semester = decodeURIComponent(req.url.split('/api/courses/semester/')[1]);
        
        if (!semester) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'No semester was specified.' }));
            return;
        }

        (async () => {
            try {
                const courses = await getCoursesBySemester(semester);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ courses }));
            } catch (error) {
                console.error('Error getting courses by semester:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load semester courses.' }));
            }
        })();
    }
    
    // ========== FINANCIAL MANAGEMENT API ENDPOINTS ==========
    
    // Get user debt
    else if (req.url === '/api/financial/debt' && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        (async () => {
            try {
                const debt = await getUserDebt(session.username);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ debt }));
            } catch (error) {
                console.error('Error getting user debt:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load the outstanding balance.' }));
            }
        })();
    }
    
    // Settle debt
    else if (req.url === '/api/financial/settle-debt' && req.method === 'POST') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { tuitionDebt, dormitoryDebt, totalDebt } = JSON.parse(body);
                
                // Get current balance
                const currentBalance = await getUserBalance(session.username);
                
                // Check if balance is sufficient
                if (currentBalance < totalDebt) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Insufficient balance to settle the debt.' }));
                    return;
                }
                
                // Deduct the debt amount from balance
                const newBalance = currentBalance - totalDebt;
                const balanceUpdateSuccess = await updateUserBalance(session.username, -totalDebt);
                
                if (balanceUpdateSuccess) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        message: 'Debt settled successfully.', 
                        settledAmount: totalDebt,
                        newBalance: newBalance
                    }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Failed to update account balance.' }));
                }
            } catch (error) {
                console.error('Error settling debt:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to settle the debt.' }));
            }
        });
    }
    
    // ========== REQUEST MANAGEMENT API ENDPOINTS ==========
    
    // Get all requests for the current user
    else if (req.url === '/api/requests' && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        (async () => {
            try {
                const requests = await getUserRequests(session.username);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ requests }));
            } catch (error) {
                console.error('Error getting user requests:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load requests.' }));
            }
        })();
    }
    
    // Create a new request
    else if (req.url === '/api/requests' && req.method === 'POST') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const requestData = JSON.parse(body);
                
                // Validate request data
                if (!requestData.title || !requestData.recipient || !requestData.description) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'The request information is incomplete.' }));
                    return;
                }
                
                const result = await createRequest(session.username, requestData);
                
                if (result.success) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Request submitted successfully.' }));
                } else {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: result.message }));
                }
            } catch (error) {
                console.error('Error creating request:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to submit the request.' }));
            }
        });
    }
    
    // Get a specific request by ID
    else if (req.url.startsWith('/api/requests/') && req.method === 'GET') {
        const cookies = cookie.parse(req.headers.cookie || '');
        const session = sessions[cookies.session];
    
        if (!session) {
            res.writeHead(401, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Unauthorized. Please log in.' }));
            return;
        }

        // Extract request ID from URL
        const requestId = req.url.split('/api/requests/')[1];
        
        if (!requestId) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Request ID was not provided.' }));
            return;
        }

        (async () => {
            try {
                const request = await getRequestById(requestId);
                
                if (!request) {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Request not found.' }));
                    return;
                }
                
                // Check if the request belongs to the current user
                if (request.username !== session.username) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Access denied.' }));
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(request));
            } catch (error) {
                console.error('Error getting request details:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Failed to load request details.' }));
            }
        })();
    }
    else { 
        res.writeHead(404, { 'Content-Type': 'text/plain' }); 
        res.end('Page Not Found'); 
    } 
}); 


   
// Configure the server port and start listening 
const PORT = Number(process.env.PORT) || 3001; 
server.listen(PORT, () => { 
    console.log(`Server running at http://localhost:${PORT}`); 
}); 
