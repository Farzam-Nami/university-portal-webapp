const { MongoClient, ObjectId } = require('mongodb');

// MongoDB connection settings. Override them with environment variables when needed. 
const url = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017'; 
const client = new MongoClient(url); 
 
// Database name 
const dbName = process.env.MONGODB_DB || 'universityPortal'; 
 
async function connectToDatabase() { 
    try { 
        await client.connect(); 
        console.log('Connected successfully to MongoDB'); 
        const db = client.db(dbName); 
        return db; 
    } catch (err) { 
        console.error(err); 
        throw new Error('Failed to connect to MongoDB'); 
    } 
} 



// Function to get courses for the current semester
async function getCurrentSemesterCourses() {
    try {
        const db = await connectToDatabase();
        const semesters = await getAllSemesters();

        if (semesters.length === 0) {
            return [];
        }

        const currentSemester = semesters[semesters.length - 1];
        const courses = await db.collection('courses')
            .find({ semester: currentSemester })
            .toArray();

        return courses;
    } catch (err) {
        console.error('Error fetching current semester courses:', err);
        return [];
    }
}

// Function to get all courses grouped by semester
async function getAllCourses() {
    try {
        const db = await connectToDatabase();
        const courses = await db.collection('courses')
            .find({})
            .toArray();
        return courses;
    } catch (err) {
        console.error('Error fetching all courses:', err);
        return [];
    }
}

// Function to get courses by specific semester
async function getCoursesBySemester(semester) {
    try {
        const db = await connectToDatabase();
        const courses = await db.collection('courses')
            .find({ semester: semester })
            .toArray();
        return courses;
    } catch (err) {
        console.error('Error fetching courses by semester:', err);
        return [];
    }
}

// Function to get list of all available semesters
async function getAllSemesters() {
    try {
        const db = await connectToDatabase();
        const semesters = await db.collection('courses')
            .distinct('semester');
        
        // Define semester order for proper sorting
        const semesterOrder = {
            'Fall 2021': 1,
            'Spring 2022': 2,
            'Fall 2022': 3,
            'Spring 2023': 4,
            'Fall 2023': 5,
            'Spring 2024': 6,
            'Fall 2024': 7,
            'Spring 2025': 8
        };
        
        // Sort semesters by order
        return semesters.sort((a, b) => {
            return (semesterOrder[a] || 999) - (semesterOrder[b] || 999);
        });
    } catch (err) {
        console.error('Error fetching semesters:', err);
        return [];
    }
}

// Function to get average scores by semester
async function getScoresBySemester() {
    try {
        const db = await connectToDatabase();
        const courses = await db.collection('courses').find({}).toArray();
        
        // Group courses by semester and calculate average scores
        const semesterScores = {};
        courses.forEach(course => {
            if (course.score !== null && course.score !== undefined) {
                if (!semesterScores[course.semester]) {
                    semesterScores[course.semester] = {
                        totalScore: 0,
                        count: 0
                    };
                }
                semesterScores[course.semester].totalScore += course.score;
                semesterScores[course.semester].count += 1;
            }
        });
        
        // Define semester mapping for proper ordering and short names
        const semesterOrder = {
            'Fall 2021': { order: 1, shortName: 'Semester 1' },
            'Spring 2022': { order: 2, shortName: 'Semester 2' },
            'Fall 2022': { order: 3, shortName: 'Semester 3' },
            'Spring 2023': { order: 4, shortName: 'Semester 4' },
            'Fall 2023': { order: 5, shortName: 'Semester 5' },
            'Spring 2024': { order: 6, shortName: 'Semester 6' },
            'Fall 2024': { order: 7, shortName: 'Semester 7' },
            'Spring 2025': { order: 8, shortName: 'Semester 8' }
        };
        
        // Calculate averages and sort by semester order
        const result = Object.keys(semesterScores)
            .filter(semester => semesterOrder[semester]) // Only include semesters with scores
            .map(semester => {
                const avg = (semesterScores[semester].totalScore / semesterScores[semester].count).toFixed(2);
                return {
                    semester: semester,
                    average: avg,
                    shortName: semesterOrder[semester].shortName,
                    order: semesterOrder[semester].order
                };
            })
            .sort((a, b) => a.order - b.order); // Sort by semester order
        
        return result;
    } catch (err) {
        console.error('Error calculating scores by semester:', err);
        return [];
    }
}

// Function to get today's courses
async function getTodaysCourses() {
    try {
        const db = await connectToDatabase();
        const currentSemesterCourses = await db.collection('courses')
            .find({semester: 'Spring 2025'})
            .toArray();
        
        // Get current day of week (0 = Sunday, 1 = Monday, etc.)
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        // JavaScript weekday mapping (0 = Sunday, 6 = Saturday).
        const dayNames = {
            0: 'Sunday',
            1: 'Monday', 
            2: 'Tuesday',
            3: 'Wednesday',
            4: 'Thursday',
            5: 'Friday',
            6: 'Saturday'
        };
        
        const todayName = dayNames[dayOfWeek];
        
        // Filter courses that have classes today
        const todaysCourses = currentSemesterCourses.filter(course => {
            if (!course.classTime || course.classTime === '-') {
                return false;
            }
            
            // Check if today's day is mentioned in the classTime
            return course.classTime.includes(todayName);
        }).map(course => {
            // Extract time for today from classTime string
            const timePattern = new RegExp(todayName + '\\s+(\\d{1,2}:\\d{2}-\\d{1,2}:\\d{2})');
            const timeMatch = course.classTime.match(timePattern);
            const todayTime = timeMatch ? timeMatch[1] : course.classTime;
            
            return {
                name: course.name,
                professor: course.professor,
                time: todayTime,
                classTime: course.classTime
            };
        });
        
        // Sort by time properly (convert to minutes for comparison)
        todaysCourses.sort((a, b) => {
            // Extract start time from time string (format: "HH:MM-HH:MM")
            const getStartTimeInMinutes = (timeStr) => {
                const startTime = timeStr.split('-')[0].trim();
                const [hours, minutes] = startTime.split(':').map(Number);
                return hours * 60 + minutes;
            };
            
            const timeA = getStartTimeInMinutes(a.time);
            const timeB = getStartTimeInMinutes(b.time);
            
            return timeA - timeB; // Sort ascending by start time
        });
        
        return todaysCourses;
    } catch (err) {
        console.error('Error fetching today\'s courses:', err);
        return [];
    }
}
 
// Function to get user profile by username
async function getUserProfile(username) {
    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username }, { projection: { password: 0 } }); // Exclude password
        return user;
    } catch (err) {
        console.error('Error fetching user profile:', err);
        return null;
    }
}

// Function to update user profile (excluding password)
async function updateUserProfile(username, profileData) {
    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        // Remove password and username from update data to prevent unauthorized changes
        const { password, username: _, ...updateFields } = profileData;
        
        const result = await usersCollection.updateOne(
            { username },
            { $set: updateFields }
        );
        
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error updating user profile:', err);
        return false;
    }
}

// Function to update user password
async function updateUserPassword(username, hashedNewPassword) {
    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.updateOne(
            { username },
            { $set: { password: hashedNewPassword } }
        );
        
        return result.modifiedCount > 0;
    } catch (err) {
        console.error('Error updating user password:', err);
        return false;
    }
}

// Function to validate user's current password
async function validateUserPassword(username, hashedPassword) {
    try {
        const db = await connectToDatabase();
        const usersCollection = db.collection('users');
        const user = await usersCollection.findOne({ username });
        
        if (!user) {
            return false;
        }
        
        const bcrypt = require('bcrypt');
        return await bcrypt.compare(hashedPassword, user.password);
    } catch (err) {
        console.error('Error validating user password:', err);
        return false;
    }
}

// ========== FOOD RESERVATION SYSTEM FUNCTIONS ==========

// Function to get user balance
async function getUserBalance(username) {
    try {
        const db = await connectToDatabase();
        const balancesCollection = db.collection('userBalances');
        const balance = await balancesCollection.findOne({ username });
        return balance ? balance.amount : 0;
    } catch (err) {
        console.error('Error fetching user balance:', err);
        return 0;
    }
}

// Function to update user balance
async function updateUserBalance(username, amount) {
    try {
        const db = await connectToDatabase();
        const balancesCollection = db.collection('userBalances');
        
        await balancesCollection.updateOne(
            { username },
            { 
                $inc: { amount: amount },
                $set: { updatedAt: new Date() },
                $setOnInsert: { createdAt: new Date() }
            },
            { upsert: true }
        );
        
        return true;
    } catch (err) {
        console.error('Error updating user balance:', err);
        return false;
    }
}

// Function to initialize food menu
async function initializeFoodMenu() {
    try {
        const db = await connectToDatabase();
        const menuCollection = db.collection('foodMenu');
        
        // Check if menu already exists
        const existingMenu = await menuCollection.countDocuments();
        if (existingMenu > 0) {
            return; // Menu already initialized
        }
        
        const foodMenu = [
            // Breakfast
            { mealType: 'breakfast', name: 'Omelet', price: 15000, image: '🍳' },
            { mealType: 'breakfast', name: 'Kaleh Pacheh', price: 25000, image: '🍲' },
            { mealType: 'breakfast', name: 'Butter and Jam', price: 12000, image: '🍞' },
            
            // Lunch (Lunch)
            { mealType: 'lunch', name: 'Abgoosht', price: 35000, image: '🥘' },
            { mealType: 'lunch', name: 'Chelo Kebab', price: 45000, image: '🍖' },
            { mealType: 'lunch', name: 'Gheimeh Stew', price: 30000, image: '🍛' },
            
            // Dinner
            { mealType: 'dinner', name: 'Yatimcheh', price: 28000, image: '🍲' },
            { mealType: 'dinner', name: 'Grilled Chicken', price: 40000, image: '🍗' },
            { mealType: 'dinner', name: 'Pasta', price: 25000, image: '🍝' }
        ];
        
        await menuCollection.insertMany(foodMenu);
        console.log('Food menu initialized successfully');
    } catch (err) {
        console.error('Error initializing food menu:', err);
    }
}

// Function to get food menu
async function getFoodMenu() {
    try {
        const db = await connectToDatabase();
        const menuCollection = db.collection('foodMenu');
        return await menuCollection.find({}).toArray();
    } catch (err) {
        console.error('Error fetching food menu:', err);
        return [];
    }
}

// Function to make a food reservation
async function makeReservation(username, reservationData) {
    try {
        const db = await connectToDatabase();
        const reservationsCollection = db.collection('reservedMeals');
        const balancesCollection = db.collection('userBalances');
        
        // Check if user already has a reservation for this meal on this date
        const existingReservation = await reservationsCollection.findOne({
            username,
            date: reservationData.date,
            mealType: reservationData.mealType,
            status: 'active'
        });
        
        if (existingReservation) {
            const mealNames = {
                'breakfast': 'Breakfast',
                'lunch': 'Lunch', 
                'dinner': 'Dinner'
            };
            return { 
                success: false, 
                message: `You already have a reservation for ${mealNames[reservationData.mealType]} on this date.` 
            };
        }
        
        // Check user balance
        const currentBalance = await getUserBalance(username);
        if (currentBalance < reservationData.price) {
            return { success: false, message: 'Insufficient balance.' };
        }
        
        // Create reservation
        const reservation = {
            username,
            cafeteria: reservationData.cafeteria,
            date: reservationData.date,
            mealType: reservationData.mealType,
            foodName: reservationData.foodName,
            price: reservationData.price,
            createdAt: new Date(),
            status: 'active'
        };
        
        await reservationsCollection.insertOne(reservation);
        
        // Deduct from balance
        await updateUserBalance(username, -reservationData.price);
        
        return { success: true, message: 'Reservation created successfully.' };
    } catch (err) {
        console.error('Error making reservation:', err);
        return { success: false, message: 'Failed to create the reservation.' };
    }
}

// Function to get user reservations
async function getUserReservations(username) {
    try {
        const db = await connectToDatabase();
        const reservationsCollection = db.collection('reservedMeals');
        
        return await reservationsCollection
            .find({ username, status: 'active' })
            .sort({ date: 1, mealType: 1 })
            .toArray();
    } catch (err) {
        console.error('Error fetching user reservations:', err);
        return [];
    }
}

// Function to check if user has existing reservation for a specific date and meal
async function checkExistingReservation(username, date, mealType) {
    try {
        const db = await connectToDatabase();
        const reservationsCollection = db.collection('reservedMeals');
        
        const existingReservation = await reservationsCollection.findOne({
            username,
            date,
            mealType,
            status: 'active'
        });
        
        return !!existingReservation;
    } catch (err) {
        console.error('Error checking existing reservation:', err);
        return false;
    }
}

// Function to cancel reservation
async function cancelReservation(username, reservationId) {
    try {
        const db = await connectToDatabase();
        const reservationsCollection = db.collection('reservedMeals');
        const { ObjectId } = require('mongodb');
        
        // Find the reservation
        const reservation = await reservationsCollection.findOne({
            _id: new ObjectId(reservationId),
            username,
            status: 'active'
        });
        
        if (!reservation) {
            return { success: false, message: 'Reservation not found.' };
        }
        
        // Check if it's more than 1 day before the reservation date
        const reservationDate = new Date(reservation.date);
        const currentDate = new Date();
        const diffTime = reservationDate.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) {
            return { success: false, message: 'Reservations cannot be cancelled less than one day in advance.' };
        }
        
        // Cancel reservation
        await reservationsCollection.updateOne(
            { _id: new ObjectId(reservationId) },
            { $set: { status: 'cancelled', cancelledAt: new Date() } }
        );
        
        // Refund to balance
        await updateUserBalance(username, reservation.price);
        
        return { success: true, message: 'Reservation cancelled successfully and the amount was refunded.' };
    } catch (err) {
        console.error('Error cancelling reservation:', err);
        return { success: false, message: 'Failed to cancel the reservation.' };
    }
}

// Function to edit reservation
async function editReservation(username, reservationId, newReservationData) {
    try {
        const db = await connectToDatabase();
        const reservationsCollection = db.collection('reservedMeals');
        const { ObjectId } = require('mongodb');
        
        // Find the existing reservation
        const existingReservation = await reservationsCollection.findOne({
            _id: new ObjectId(reservationId),
            username,
            status: 'active'
        });
        
        if (!existingReservation) {
            return { success: false, message: 'Reservation not found.' };
        }
        
        // Check if it's more than 1 day before the reservation date
        const reservationDate = new Date(existingReservation.date);
        const currentDate = new Date();
        const diffTime = reservationDate.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 1) {
            return { success: false, message: 'Reservations cannot be edited less than one day in advance.' };
        }
        
        // Check if user is trying to change to a meal type that already has a reservation on the same date
        // (only if the meal type is changing)
        if (existingReservation.mealType !== newReservationData.mealType) {
            const conflictingReservation = await reservationsCollection.findOne({
                username,
                date: existingReservation.date,
                mealType: newReservationData.mealType,
                status: 'active',
                _id: { $ne: new ObjectId(reservationId) } // Exclude current reservation
            });
            
            if (conflictingReservation) {
                const mealNames = {
                    'breakfast': 'Breakfast',
                    'lunch': 'Lunch',
                    'dinner': 'Dinner'
                };
                return { 
                    success: false, 
                    message: `You already have a reservation for ${mealNames[newReservationData.mealType]} on this date.` 
                };
            }
        }
        
        // Calculate price difference
        const oldPrice = existingReservation.price;
        const newPrice = newReservationData.price;
        const priceDifference = newPrice - oldPrice;
        
        // Check if user has enough balance for price increase
        if (priceDifference > 0) {
            const currentBalance = await getUserBalance(username);
            if (currentBalance < priceDifference) {
                return { success: false, message: 'Insufficient balance to update the reservation.' };
            }
        }
        
        // Update the reservation
        await reservationsCollection.updateOne(
            { _id: new ObjectId(reservationId) },
            { 
                $set: {
                    cafeteria: newReservationData.cafeteria,
                    mealType: newReservationData.mealType,
                    foodName: newReservationData.foodName,
                    price: newPrice,
                    updatedAt: new Date()
                }
            }
        );
        
        // Update balance based on price difference
        if (priceDifference !== 0) {
            await updateUserBalance(username, -priceDifference);
        }
        
        let message = 'Reservation updated successfully.';
        if (priceDifference > 0) {
            message += ` and ${priceDifference.toLocaleString()} Toman was deducted from your balance`;
        } else if (priceDifference < 0) {
            message += ` and ${Math.abs(priceDifference).toLocaleString()} Toman was added to your balance`;
        }
        
        return { success: true, message };
    } catch (err) {
        console.error('Error editing reservation:', err);
        return { success: false, message: 'Failed to update the reservation.' };
    }
}

// ========== FINANCIAL MANAGEMENT FUNCTIONS ==========

// Function to get user debt
async function getUserDebt(username) {
    try {
        const db = await connectToDatabase();
        const debtsCollection = db.collection('userDebts');
        
        const userDebt = await debtsCollection.findOne({ username });
        return userDebt ? userDebt.amount : 0;
    } catch (err) {
        console.error('Error fetching user debt:', err);
        return 0;
    }
}

// Function to update user debt
async function updateUserDebt(username, amount) {
    try {
        const db = await connectToDatabase();
        const debtsCollection = db.collection('userDebts');
        
        await debtsCollection.updateOne(
            { username },
            { 
                $inc: { amount: amount },
                $set: { updatedAt: new Date() }
            },
            { upsert: true }
        );
        
        return true;
    } catch (err) {
        console.error('Error updating user debt:', err);
        return false;
    }
}

// Function to settle user debt
async function settleDebt(username) {
    try {
        const db = await connectToDatabase();
        const debtsCollection = db.collection('userDebts');
        
        // Get current debt
        const userDebt = await debtsCollection.findOne({ username });
        if (!userDebt || userDebt.amount <= 0) {
            return { success: false, message: 'No outstanding debt was found.' };
        }
        
        // Get current balance
        const currentBalance = await getUserBalance(username);
        if (currentBalance < userDebt.amount) {
            return { success: false, message: 'Insufficient balance to settle the debt.' };
        }
        
        // Deduct from balance
        const balanceSuccess = await updateUserBalance(username, -userDebt.amount);
        if (!balanceSuccess) {
            return { success: false, message: 'Failed to deduct the balance.' };
        }
        
        // Clear debt
        await debtsCollection.updateOne(
            { username },
            { 
                $set: { 
                    amount: 0,
                    settledAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );
        
        return { 
            success: true, 
            message: `Debt of ${userDebt.amount.toLocaleString()} Toman was settled successfully`,
            settledAmount: userDebt.amount
        };
    } catch (err) {
        console.error('Error settling debt:', err);
        return { success: false, message: 'Failed to settle the debt.' };
    }
}

// ========== REQUEST MANAGEMENT FUNCTIONS ==========

// Function to create a new request
async function createRequest(username, requestData) {
    try {
        const db = await connectToDatabase();
        const requestsCollection = db.collection('requests');
        
        // Generate request ID
        const count = await requestsCollection.countDocuments();
        const requestId = `REQ-${(count + 1).toString().padStart(4, '0')}`;
        
        // Store the request date in ISO format.
        const now = new Date();
        const requestDate = now.toISOString().slice(0, 10);
        
        const newRequest = {
            id: requestId,
            username,
            title: requestData.title,
            recipient: requestData.recipient,
            description: requestData.description,
            hasFile: requestData.hasFile || false,
            status: 'Pending', // Default status
            date: requestDate,
            createdAt: now,
            updatedAt: now
        };
        
        const result = await requestsCollection.insertOne(newRequest);
        return { success: true, requestId: result.insertedId };
    } catch (err) {
        console.error('Error creating request:', err);
        return { success: false, message: 'Failed to submit the request.' };
    }
}

// Function to get all requests for a user
async function getUserRequests(username) {
    try {
        const db = await connectToDatabase();
        const requestsCollection = db.collection('requests');
        
        const requests = await requestsCollection
            .find({ username })
            .sort({ createdAt: -1 })
            .toArray();
        
        return requests;
    } catch (err) {
        console.error('Error fetching user requests:', err);
        return [];
    }
}

// Function to get a specific request by ID
async function getRequestById(requestId) {
    try {
        const db = await connectToDatabase();
        const requestsCollection = db.collection('requests');
        
        const request = await requestsCollection.findOne({ _id: new ObjectId(requestId) });
        return request;
    } catch (err) {
        console.error('Error fetching request:', err);
        return null;
    }
}

// Function to update request status (for admin use)
async function updateRequestStatus(requestId, status) {
    try {
        const db = await connectToDatabase();
        const requestsCollection = db.collection('requests');
        
        await requestsCollection.updateOne(
            { _id: new ObjectId(requestId) },
            { 
                $set: {
                    status,
                    updatedAt: new Date()
                }
            }
        );
        
        return true;
    } catch (err) {
        console.error('Error updating request status:', err);
        return false;
    }
}

module.exports = { 
    connectToDatabase, 
    client,
    
    getCurrentSemesterCourses,
    getAllCourses,
    getCoursesBySemester,
    getAllSemesters,
    getScoresBySemester,
    getTodaysCourses,
    getUserProfile,
    updateUserProfile,
    updateUserPassword,
    validateUserPassword,
    // Food reservation functions
    getUserBalance,
    updateUserBalance,
    initializeFoodMenu,
    getFoodMenu,
    makeReservation,
    getUserReservations,
    cancelReservation,
    editReservation,
    checkExistingReservation,
    // Financial management functions
    getUserDebt,
    updateUserDebt,
    settleDebt,
    // Request management functions
    createRequest,
    getUserRequests,
    getRequestById,
    updateRequestStatus
}; 