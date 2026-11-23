// Food Reservation JavaScript
let selectedCafeteria = null;
let selectedDate = null;
let selectedMeal = 'breakfast';
let selectedFood = null;
let currentReservation = {};

// Debug: Ensure functions are available immediately

// Show increase balance modal (global function) - defined immediately
window.showIncreaseBalanceModal = function() {
    document.getElementById('increaseBalanceModal').style.display = 'block';
}

// Close increase balance modal (global function)
window.closeIncreaseBalanceModal = function() {
    document.getElementById('increaseBalanceModal').style.display = 'none';
    document.getElementById('increaseAmount').value = '';
}

// Close reservation modal (global function)
window.closeReservationModal = function() {
    document.getElementById('reservationModal').style.display = 'none';
}

// Load reservations (global function)
window.loadReservations = async function() {
    try {
        const response = await fetch('/api/food/reservations');
        const result = await response.json();
        
        if (response.ok) {
            displayReservations(result.reservations);
        } else {
            console.error('Error loading reservations:', result.message);
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

// Increase balance (global function)
window.increaseBalance = async function() {
    const amount = parseInt(document.getElementById('increaseAmount').value);
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    if (!amount || amount < 1000) {
        alert('Please enter an amount of at least 1,000 Toman.');
        return;
    }
    
    try {
        const response = await fetch('/api/food/increase-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, paymentMethod })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Balance updated successfully.');
            window.closeIncreaseBalanceModal();
            loadUserBalance();
        } else {
            alert(result.message || 'Failed to add funds.');
        }
    } catch (error) {
        console.error('Error increasing balance:', error);
        alert('Failed to add funds.');
    }
}

// Cancel reservation (global function)
window.cancelReservation = async function(reservationId) {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/food/cancel', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reservationId })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message);
            loadUserBalance();
            window.loadReservations();
            // Refresh meal tab status
            if (selectedDate) {
                updateMealTabStatus();
            }
        } else {
            alert(result.message || 'Failed to cancel the reservation.');
        }
    } catch (error) {
        console.error('Error cancelling reservation:', error);
        alert('Failed to cancel the reservation.');
    }
}

// Confirm reservation (global function)
window.confirmReservation = async function() {
    try {
        const response = await fetch('/api/food/reserve', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentReservation)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Reservation created successfully.');
            window.closeReservationModal();
            loadUserBalance();
            window.loadReservations();
            resetSelection();
            // Refresh meal tab status
            if (selectedDate) {
                updateMealTabStatus();
            }
        } else {
            alert(result.message || 'Failed to create the reservation.');
        }
    } catch (error) {
        console.error('Error making reservation:', error);
        alert('Failed to create the reservation.');
    }
}

// Convert Persian and Arabic-Indic digits to Western digits.
function toEnglishNumerals(value) {
    return String(value).replace(/[\u06F0-\u06F9\u0660-\u0669]/g, digit => {
        const code = digit.charCodeAt(0);
        return String(code >= 0x06F0 ? code - 0x06F0 : code - 0x0660);
    });
}

function toLocalISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Format number with comma separator
function formatPrice(price) {
    return toEnglishNumerals(price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ","));
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadUserBalance();
    generateDateGrid();
    setupEventListeners();
    window.loadReservations(); // Call the global function
    
    // Set initial date to today if no date is selected
    if (!selectedDate) {
        const today = new Date();
        selectedDate = toLocalISODate(today);
        const todayElement = document.querySelector(`[data-date="${selectedDate}"]`);
        if (todayElement) {
            todayElement.classList.add('selected');
            checkSelectionStatus();
        }
    }
});

// Load user balance
async function loadUserBalance() {
    try {
        const response = await fetch('/api/food/balance');
        const result = await response.json();
        if (response.ok) {
            document.getElementById('balanceAmount').textContent = formatPrice(result.balance);
        } else {
            console.error('Error loading balance:', result.message);
        }
    } catch (error) {
        console.error('Error loading balance:', error);
    }
}

// Generate date grid (next 7 days + calendar widget)
function generateDateGrid() {
    const dateGrid = document.getElementById('dateGrid');
    const today = new Date();
    
    // Generate next 7 days
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        
        const dateDiv = document.createElement('div');
        dateDiv.className = 'date-option';
        dateDiv.dataset.date = toLocalISODate(date);
        
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        const dateStr = date.toLocaleDateString('en-US');
        
        dateDiv.innerHTML = `
            <div class="day-name">${dayName}</div>
            <div class="date-str">${toEnglishNumerals(dateStr)}</div>
        `;
        
        dateGrid.appendChild(dateDiv);
    }
    
    // Add calendar widget
    const calendarDiv = document.createElement('div');
    calendarDiv.className = 'calendar-widget';
    calendarDiv.innerHTML = `
        <div class="calendar-icon">📅</div>
        <div class="calendar-text">Choose another date</div>
    `;
    
    // Add click event to open custom date picker modal
    calendarDiv.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        openDatePickerModal();
    });
    
    dateGrid.appendChild(calendarDiv);
}

// Setup event listeners
function setupEventListeners() {
    // Cafeteria selection
    document.querySelectorAll('.cafeteria-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.cafeteria-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            selectedCafeteria = this.dataset.value;
            checkSelectionStatus();
        });
    });

    // Date selection
    document.addEventListener('click', function(e) {
        if (e.target.closest('.date-option')) {
            document.querySelectorAll('.date-option').forEach(o => o.classList.remove('selected'));
            document.querySelectorAll('.calendar-widget').forEach(o => o.classList.remove('selected'));
            
            const dateOption = e.target.closest('.date-option');
            dateOption.classList.add('selected');
            selectedDate = dateOption.dataset.date;
            
            // Reset calendar widget text
            const calendarWidget = document.querySelector('.calendar-widget');
            if (calendarWidget) {
                calendarWidget.querySelector('.calendar-text').textContent = 'Choose another date';
            }
            
            checkSelectionStatus();
        }
    });

    // Meal tabs
    document.querySelectorAll('.meal-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const mealType = this.dataset.meal;
            
            // Update tabs
            document.querySelectorAll('.meal-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update sections
            document.querySelectorAll('.meal-section').forEach(s => s.classList.remove('active'));
            document.getElementById(mealType + '-section').classList.add('active');
            
            selectedMeal = mealType;
            checkSelectionStatus();
        });
    });

    // Food selection
    document.querySelectorAll('.food-select-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const foodItem = this.closest('.food-item');
            selectedFood = {
                meal: foodItem.dataset.meal,
                name: foodItem.dataset.name,
                price: parseInt(foodItem.dataset.price)
            };
            
            if (validateReservationData()) {
                checkExistingReservationBeforeBooking();
            }
        });
    });
}

// Check if user already has a reservation for selected date and meal
async function checkExistingReservationBeforeBooking() {
    if (!selectedDate || !selectedMeal) {
        showReservationSummary();
        return;
    }
    
    try {
        const response = await fetch(`/api/food/check-reservation?date=${selectedDate}&mealType=${selectedMeal}`);
        const result = await response.json();
        
        if (response.ok) {
            if (result.hasReservation) {
                const mealNames = {
                    'breakfast': 'Breakfast',
                    'lunch': 'Lunch',
                    'dinner': 'Dinner'
                };
                alert(`You already have a reservation for ${mealNames[selectedMeal]} on this date.`);
                return;
            }
            showReservationSummary();
        } else {
            console.error('Error checking reservation:', result.message);
            showReservationSummary(); // Continue with booking if check fails
        }
    } catch (error) {
        console.error('Error checking reservation:', error);
        showReservationSummary(); // Continue with booking if check fails
    }
}

// Check selection status and update UI feedback
async function checkSelectionStatus() {
    if (selectedDate && selectedMeal) {
        updateMealTabStatus();
    }
}

// Update meal tab status to show which meals are already reserved
async function updateMealTabStatus() {
    if (!selectedDate) return;
    
    const mealTypes = ['breakfast', 'lunch', 'dinner'];
    
    for (const mealType of mealTypes) {
        try {
            const response = await fetch(`/api/food/check-reservation?date=${selectedDate}&mealType=${mealType}`);
            const result = await response.json();
            
            const mealTab = document.querySelector(`[data-meal="${mealType}"]`);
            if (mealTab) {
                if (result.hasReservation) {
                    mealTab.classList.add('reserved');
                    mealTab.title = 'You already have a reservation for this meal.';
                } else {
                    mealTab.classList.remove('reserved');
                    mealTab.title = '';
                }
            }
        } catch (error) {
            console.error(`Error checking ${mealType} reservation:`, error);
        }
    }
}

// Validate reservation data
function validateReservationData() {
    if (!selectedCafeteria) {
        alert('Please select a cafeteria.');
        return false;
    }
    if (!selectedDate) {
        alert('Please select a date.');
        return false;
    }
    if (!selectedFood) {
        alert('Please select a meal.');
        return false;
    }
    return true;
}

// Show reservation summary modal
function showReservationSummary() {
    const cafeteriaNames = {
        'central': 'Main Cafeteria',
        'electrical': 'Engineering Cafeteria',
        'sobhan': 'Sobhan Restaurant',
        'golestan': 'Golestan Restaurant'
    };
    
    const mealNames = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner'
    };
    
    const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
    const formattedDate = selectedDateObj.toLocaleDateString('en-US');
    
    document.getElementById('summaryCalculate').textContent = cafeteriaNames[selectedCafeteria];
    document.getElementById('summaryDate').textContent = toEnglishNumerals(formattedDate);
    document.getElementById('summaryMeal').textContent = mealNames[selectedFood.meal];
    document.getElementById('summaryFood').textContent = selectedFood.name;
    document.getElementById('summaryPrice').textContent = formatPrice(selectedFood.price) + ' Toman';
    
    currentReservation = {
        cafeteria: selectedCafeteria,
        date: selectedDate,
        mealType: selectedFood.meal,
        foodName: selectedFood.name,
        price: selectedFood.price
    };
    
    document.getElementById('reservationModal').style.display = 'block';
}

// Reset selection
function resetSelection() {
    selectedCafeteria = null;
    selectedDate = null;
    selectedFood = null;
    
    document.querySelectorAll('.cafeteria-option').forEach(o => o.classList.remove('selected'));
    document.querySelectorAll('.date-option').forEach(o => o.classList.remove('selected'));
    document.querySelectorAll('.calendar-widget').forEach(o => {
        o.classList.remove('selected');
        const calendarText = o.querySelector('.calendar-text');
        if (calendarText) {
            calendarText.textContent = 'Choose another date';
        }
    });
}

// Load reservations
async function loadReservations() {
    try {
        const response = await fetch('/api/food/reservations');
        const result = await response.json();
        
        if (response.ok) {
            displayReservations(result.reservations);
        } else {
            console.error('Error loading reservations:', result.message);
        }
    } catch (error) {
        console.error('Error loading reservations:', error);
    }
}

// Display reservations
function displayReservations(reservations) {
    const container = document.getElementById('reservationsList');
    
    if (reservations.length === 0) {
        container.innerHTML = '<div class="no-reservations">No reservations found.</div>';
        return;
    }
    
    const cafeteriaNames = {
        'central': 'Main Cafeteria',
        'electrical': 'Engineering Cafeteria',
        'sobhan': 'Sobhan Restaurant',
        'golestan': 'Golestan Restaurant'
    };
    
    const mealNames = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner'
    };
    
    container.innerHTML = reservations.map(reservation => {
        const date = new Date(`${reservation.date}T00:00:00`);
        const formattedDate = date.toLocaleDateString('en-US');
        const currentDate = new Date();
        const diffTime = date.getTime() - currentDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const canCancel = diffDays >= 1;
        
        return `
            <div class="reservation-item">
                <div class="reservation-info">
                    <div class="reservation-header">
                        <span class="food-name">${reservation.foodName}</span>
                        <span class="reservation-price">${formatPrice(reservation.price)} Toman</span>
                    </div>
                    <div class="reservation-details">
                        <span>${cafeteriaNames[reservation.cafeteria]} • ${mealNames[reservation.mealType]} • ${toEnglishNumerals(formattedDate)}</span>
                    </div>
                </div>
                <div class="reservation-actions">
                    ${canCancel ? `
                        <button class="btn btn-warning btn-small" onclick="showEditReservationModal('${reservation._id}', '${reservation.cafeteria}', '${reservation.mealType}', '${reservation.foodName}', ${reservation.price})">Edit</button>
                        <button class="btn btn-danger btn-small" onclick="cancelReservation('${reservation._id}')">Cancel Reservation</button>
                    ` : '<span class="cannot-cancel">Cannot be edited</span>'}
                </div>
            </div>
        `;
    }).join('');
}

// Close modals when clicking outside
window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.style.display = 'none';
    }
});

// ========== EDIT RESERVATION FUNCTIONALITY ==========

// Variables for edit functionality
let editReservationId = null;
let editSelectedCafeteria = null;
let editSelectedMeal = null;
let editSelectedFood = null;
let originalReservation = null;

// Show edit reservation modal (global function)
window.showEditReservationModal = function(reservationId, cafeteria, mealType, foodName, price) {
    
    editReservationId = reservationId;
    originalReservation = { cafeteria, mealType, foodName, price };
    
    // Set initial values
    editSelectedCafeteria = cafeteria;
    editSelectedMeal = mealType;
    editSelectedFood = { meal: mealType, name: foodName, price: price };
    
    // Update UI with current values
    updateEditCafeteriaSelection(cafeteria);
    updateEditMealSelection(mealType);
    updateEditFoodGrid(mealType);
    updateEditSummary();
    
    // Setup edit modal event listeners
    setupEditModalListeners();
    
    document.getElementById('editReservationModal').style.display = 'block';
}

// Close edit reservation modal (global function)
window.closeEditReservationModal = function() {
    document.getElementById('editReservationModal').style.display = 'none';
    resetEditSelection();
}

// Confirm edit reservation (global function)
window.confirmEditReservation = async function() {
    
    if (!editSelectedCafeteria || !editSelectedMeal || !editSelectedFood) {
        alert('Please complete all selections.');
        return;
    }
    
    try {
        const response = await fetch('/api/food/edit', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reservationId: editReservationId,
                cafeteria: editSelectedCafeteria,
                mealType: editSelectedMeal,
                foodName: editSelectedFood.name,
                price: editSelectedFood.price
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert(result.message);
            window.closeEditReservationModal();
            loadUserBalance();
            window.loadReservations();
            // Refresh meal tab status
            if (selectedDate) {
                updateMealTabStatus();
            }
        } else {
            alert(result.message || 'Failed to update the reservation.');
        }
    } catch (error) {
        console.error('Error editing reservation:', error);
        alert('Failed to update the reservation.');
    }
}

// Update cafeteria selection in edit modal
function updateEditCafeteriaSelection(selectedValue) {
    const cafeteriaOptions = document.querySelectorAll('#editCafeteriaGrid .cafeteria-option');
    cafeteriaOptions.forEach(option => {
        option.classList.remove('selected');
        if (option.dataset.value === selectedValue) {
            option.classList.add('selected');
        }
    });
}

// Update meal selection in edit modal
function updateEditMealSelection(selectedMeal) {
    const mealTabs = document.querySelectorAll('#editMealTabs .meal-tab');
    mealTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.meal === selectedMeal) {
            tab.classList.add('active');
        }
    });
}

// Update food grid in edit modal
function updateEditFoodGrid(mealType) {
    const foodGrid = document.getElementById('editFoodGrid');
    
    const foodOptions = {
        'breakfast': [
            { name: 'Omelet', price: 15000, image: '🍳' },
            { name: 'Kaleh Pacheh', price: 25000, image: '🍲' },
            { name: 'Butter and Jam', price: 12000, image: '🍞' }
        ],
        'lunch': [
            { name: 'Abgoosht', price: 35000, image: '🥘' },
            { name: 'Chelo Kebab', price: 45000, image: '🍖' },
            { name: 'Gheimeh Stew', price: 30000, image: '🍛' }
        ],
        'dinner': [
            { name: 'Yatimcheh', price: 28000, image: '🍲' },
            { name: 'Grilled Chicken', price: 40000, image: '🍗' },
            { name: 'Pasta', price: 25000, image: '🍝' }
        ]
    };
    
    const foods = foodOptions[mealType] || [];
    
    foodGrid.innerHTML = foods.map(food => `
        <div class="food-item edit-food-item" data-meal="${mealType}" data-name="${food.name}" data-price="${food.price}">
            <div class="food-image">${food.image}</div>
            <div class="food-info">
                <div class="food-name">${food.name}</div>
                <div class="food-price">${formatPrice(food.price)} Toman</div>
            </div>
            <button class="food-select-btn edit-food-select-btn">Select</button>
        </div>
    `).join('');
    
    // Highlight currently selected food
    if (editSelectedFood && editSelectedFood.meal === mealType) {
        const selectedFoodElement = Array.from(foodGrid.children).find(item => 
            item.dataset.name === editSelectedFood.name
        );
        if (selectedFoodElement) {
            selectedFoodElement.classList.add('selected');
        }
    }
}

// Update edit summary
function updateEditSummary() {
    const cafeteriaNames = {
        'central': 'Main Cafeteria',
        'electrical': 'Engineering Cafeteria',
        'sobhan': 'Sobhan Restaurant',
        'golestan': 'Golestan Restaurant'
    };
    
    const mealNames = {
        'breakfast': 'Breakfast',
        'lunch': 'Lunch',
        'dinner': 'Dinner'
    };
    
    // Current reservation summary
    document.getElementById('currentReservationSummary').innerHTML = `
        <div>Cafeteria: ${cafeteriaNames[originalReservation.cafeteria]}</div>
        <div>Meal: ${mealNames[originalReservation.mealType]}</div>
        <div>Food: ${originalReservation.foodName}</div>
        <div>Price: ${formatPrice(originalReservation.price)} Toman</div>
    `;
    
    // New reservation summary
    if (editSelectedCafeteria && editSelectedMeal && editSelectedFood) {
        const priceDiff = editSelectedFood.price - originalReservation.price;
        const diffText = priceDiff > 0 ? 
            `(Increase: ${formatPrice(priceDiff)} Toman)` : 
            priceDiff < 0 ? 
            `(Decrease: ${formatPrice(Math.abs(priceDiff))} Toman)` : 
            '';
        
        document.getElementById('newReservationSummary').innerHTML = `
            <div>Cafeteria: ${cafeteriaNames[editSelectedCafeteria]}</div>
            <div>Meal: ${mealNames[editSelectedMeal]}</div>
            <div>Food: ${editSelectedFood.name}</div>
            <div>Price: ${formatPrice(editSelectedFood.price)} Toman ${diffText}</div>
        `;
    } else {
        document.getElementById('newReservationSummary').innerHTML = 'Please make your selections.';
    }
}

// Setup edit modal event listeners
function setupEditModalListeners() {
    // Cafeteria selection in edit modal
    document.querySelectorAll('#editCafeteriaGrid .cafeteria-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('#editCafeteriaGrid .cafeteria-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            editSelectedCafeteria = this.dataset.value;
            updateEditSummary();
        });
    });
    
    // Meal tabs in edit modal
    document.querySelectorAll('#editMealTabs .meal-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            const mealType = this.dataset.meal;
            
            // Update tabs
            document.querySelectorAll('#editMealTabs .meal-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            editSelectedMeal = mealType;
            editSelectedFood = null; // Reset food selection when meal changes
            updateEditFoodGrid(mealType);
            updateEditSummary();
        });
    });
}

// Setup food selection in edit modal (called after updateEditFoodGrid)
function setupEditFoodSelection() {
    document.querySelectorAll('.edit-food-select-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const foodItem = this.closest('.edit-food-item');
            
            // Remove selection from all food items
            document.querySelectorAll('.edit-food-item').forEach(item => item.classList.remove('selected'));
            
            // Select current food item
            foodItem.classList.add('selected');
            
            editSelectedFood = {
                meal: foodItem.dataset.meal,
                name: foodItem.dataset.name,
                price: parseInt(foodItem.dataset.price)
            };
            
            updateEditSummary();
        });
    });
}

// Reset edit selection
function resetEditSelection() {
    editReservationId = null;
    editSelectedCafeteria = null;
    editSelectedMeal = null;
    editSelectedFood = null;
    originalReservation = null;
}

// Override updateEditFoodGrid to include event listeners
function updateEditFoodGrid(mealType) {
    const foodGrid = document.getElementById('editFoodGrid');
    
    const foodOptions = {
        'breakfast': [
            { name: 'Omelet', price: 15000, image: '🍳' },
            { name: 'Kaleh Pacheh', price: 25000, image: '🍲' },
            { name: 'Butter and Jam', price: 12000, image: '🍞' }
        ],
        'lunch': [
            { name: 'Abgoosht', price: 35000, image: '🥘' },
            { name: 'Chelo Kebab', price: 45000, image: '🍖' },
            { name: 'Gheimeh Stew', price: 30000, image: '🍛' }
        ],
        'dinner': [
            { name: 'Yatimcheh', price: 28000, image: '🍲' },
            { name: 'Grilled Chicken', price: 40000, image: '🍗' },
            { name: 'Pasta', price: 25000, image: '🍝' }
        ]
    };
    
    const foods = foodOptions[mealType] || [];
    
    foodGrid.innerHTML = foods.map(food => `
        <div class="food-item edit-food-item" data-meal="${mealType}" data-name="${food.name}" data-price="${food.price}">
            <div class="food-image">${food.image}</div>
            <div class="food-info">
                <div class="food-name">${food.name}</div>
                <div class="food-price">${formatPrice(food.price)} Toman</div>
            </div>
            <button class="food-select-btn edit-food-select-btn">Select</button>
        </div>
    `).join('');
    
    // Highlight currently selected food
    if (editSelectedFood && editSelectedFood.meal === mealType) {
        const selectedFoodElement = Array.from(foodGrid.children).find(item => 
            item.dataset.name === editSelectedFood.name
        );
        if (selectedFoodElement) {
            selectedFoodElement.classList.add('selected');
        }
    }
    
    // Setup event listeners for food selection
    setupEditFoodSelection();
}

// ========== CUSTOM DATE PICKER MODAL FUNCTIONS ==========

// Open custom date picker modal (global function)
window.openDatePickerModal = function() {
    
    try {
        // Initialize the date picker with current date
        initializeDatePicker();
        
        // Show the modal
        const modal = document.getElementById('customDateModal');
        if (modal) {
            modal.style.display = 'block';
        } else {
            console.error('customDateModal element not found');
        }
    } catch (error) {
        console.error('Error opening date picker modal:', error);
    }
}

// Close custom date picker modal (global function)
window.closeDatePickerModal = function() {
    document.getElementById('customDateModal').style.display = 'none';
}

// Initialize date picker with current values
function initializeDatePicker() {
    
    try {
        const today = new Date();
        const jalaliToday = convertToPersianDate(today);
        
        // Populate year dropdown (current Persian year + next 5 years)
        const yearSelect = document.getElementById('yearSelect');
        if (!yearSelect) {
            console.error('yearSelect element not found');
            return;
        }
        
        yearSelect.innerHTML = '';
        for (let year = jalaliToday.year; year <= jalaliToday.year + 5; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = toEnglishNumerals(year.toString());
            yearSelect.appendChild(option);
        }
        
        const daySelect = document.getElementById('daySelect');
        const monthSelect = document.getElementById('monthSelect');
        
        if (daySelect && monthSelect && yearSelect) {
            // Set current Persian date
            yearSelect.value = jalaliToday.year;
            monthSelect.value = jalaliToday.month;
            
            // Populate days for current month
            updateDaysForMonth();
            
            // Set current day
            daySelect.value = jalaliToday.day;
            
            // Update preview
            updateDatePreview();
            
            // Add event listeners for date changes
            setupDatePickerListeners();
            
        } else {
            console.error('One or more date picker elements not found');
        }
    } catch (error) {
        console.error('Error initializing date picker:', error);
    }
}

// Setup event listeners for date picker
function setupDatePickerListeners() {
    const daySelect = document.getElementById('daySelect');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');
    
    // Remove existing listeners to avoid duplicates
    daySelect.removeEventListener('change', updateDatePreview);
    monthSelect.removeEventListener('change', handleMonthYearChange);
    yearSelect.removeEventListener('change', handleMonthYearChange);
    
    // Add event listeners
    daySelect.addEventListener('change', updateDatePreview);
    monthSelect.addEventListener('change', handleMonthYearChange);
    yearSelect.addEventListener('change', handleMonthYearChange);
}

// Handle month/year change to update days
function handleMonthYearChange() {
    updateDaysForMonth();
    updateDatePreview();
}

// Update days dropdown based on selected Persian month and year
function updateDaysForMonth() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const daySelect = document.getElementById('daySelect');
    
    if (!month || !year || !daySelect) {
        console.error('Month, year, or daySelect not found');
        return;
    }
    
    // Persian calendar days in each month
    const isLeap = isPersianLeapYear(year);
    const daysInMonth = {
        1: 31, 2: 31, 3: 31, 4: 31, 5: 31, 6: 31,  // First 6 months
        7: 30, 8: 30, 9: 30, 10: 30, 11: 30,       // Next 5 months
        12: isLeap ? 30 : 29                        // Last month (Esfand)
    };
    
    const days = daysInMonth[month];
    const currentDay = parseInt(daySelect.value) || 1;
    
    // Clear and repopulate days
    daySelect.innerHTML = '';
    for (let day = 1; day <= days; day++) {
        const option = document.createElement('option');
        option.value = day;
        option.textContent = toEnglishNumerals(day.toString());
        daySelect.appendChild(option);
    }
    
    // Set selected day (or last day of month if current day is invalid)
    daySelect.value = Math.min(currentDay, days);
}

// Check whether the Jalali year is a leap year


// Update the date preview using the Jalali calendar
function updateDatePreview() {
    const day = document.getElementById('daySelect').value;
    const month = document.getElementById('monthSelect').value;
    const year = document.getElementById('yearSelect').value;
    
    if (day && month && year) {
        const monthNames = {
            1: 'Farvardin', 2: 'Ordibehesht', 3: 'Khordad',
            4: 'Tir', 5: 'Mordad', 6: 'Shahrivar',
            7: 'Mehr', 8: 'Aban', 9: 'Azar',
            10: 'Dey', 11: 'Bahman', 12: 'Esfand'
        };
        
        const preview = `${toEnglishNumerals(day)} ${monthNames[month]} ${toEnglishNumerals(year)}`;
        document.getElementById('datePreview').textContent = preview;
    } else {
        document.getElementById('datePreview').textContent = 'Select a date';
    }
}

// Confirm date selection (global function)
window.confirmDateSelection = function() {
    const day = parseInt(document.getElementById('daySelect').value);
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    if (!day || !month || !year) {
        alert('Please fill in all fields.');
        return;
    }
    
    
    // Convert Persian date to Gregorian for storage
    const gregorianDate = convertToGregorianDate(year, month, day);
    
    // Convert back to Persian to verify accuracy
    const verifiedJalaliDate = convertToPersianDate(gregorianDate);
    
    // Check if conversion is accurate
    if (verifiedJalaliDate.year === year && verifiedJalaliDate.month === month && verifiedJalaliDate.day === day) {
    } else {
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Validate date is not in the past
    if (gregorianDate < today) {
        alert('Reservations cannot be made for past dates.');
        return;
    }
    
    // Clear existing selections
    document.querySelectorAll('.date-option').forEach(o => o.classList.remove('selected'));
    document.querySelectorAll('.calendar-widget').forEach(o => o.classList.remove('selected'));
    
    // Select the calendar widget and set the date
    const calendarWidget = document.querySelector('.calendar-widget');
    calendarWidget.classList.add('selected');
    selectedDate = toLocalISODate(gregorianDate);
    
    
    // Update the calendar display using the Jalali date
    const monthNames = {
        1: 'Farvardin', 2: 'Ordibehesht', 3: 'Khordad',
        4: 'Tir', 5: 'Mordad', 6: 'Shahrivar',
        7: 'Mehr', 8: 'Aban', 9: 'Azar',
        10: 'Dey', 11: 'Bahman', 12: 'Esfand'
    };
    
    const persianDateStr = `${toEnglishNumerals(day)} ${monthNames[month]} ${toEnglishNumerals(year)}`;
    const dayName = gregorianDate.toLocaleDateString('en-US', { weekday: 'long' });
    calendarWidget.querySelector('.calendar-text').textContent = `${dayName} - ${persianDateStr}`;
    
    // Close modal and check selection status
    window.closeDatePickerModal();
    checkSelectionStatus();
    
}

// Helper function to get month name
function getMonthName(month) {
    const monthNames = {
        1: 'Farvardin', 2: 'Ordibehesht', 3: 'Khordad',
        4: 'Tir', 5: 'Mordad', 6: 'Shahrivar',
        7: 'Mehr', 8: 'Aban', 9: 'Azar',
        10: 'Dey', 11: 'Bahman', 12: 'Esfand'
    };
    return monthNames[month] || 'Not specified';
}

// Jalali calendar conversion functions
// Convert Gregorian dates to Jalali dates
function convertToPersianDate(gregorianDate) {
    const formatter = new Intl.DateTimeFormat('en-US-u-ca-persian', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });
    const dateParts = formatter.formatToParts(gregorianDate);
    const dateValues = {};

    dateParts.forEach(part => {
        if (part.type === 'year' || part.type === 'month' || part.type === 'day') {
            dateValues[part.type] = Number(part.value);
        }
    });

    return {
        year: dateValues.year,
        month: dateValues.month,
        day: dateValues.day
    };
}

// Check whether the Jalali year is a leap year
function isPersianLeapYear(year) {
    return convertToGregorianDate(year, 12, 30) !== null;
}

// Convert a Jalali date to its corresponding Gregorian date.
function convertToGregorianDate(persianYear, persianMonth, persianDay) {
    const startDate = new Date(persianYear + 621, 2, 19);

    for (let offset = 0; offset <= 370; offset++) {
        const candidateDate = new Date(startDate);
        candidateDate.setDate(startDate.getDate() + offset);

        const candidatePersianDate = convertToPersianDate(candidateDate);
        if (
            candidatePersianDate.year === persianYear &&
            candidatePersianDate.month === persianMonth &&
            candidatePersianDate.day === persianDay
        ) {
            return candidateDate;
        }
    }

    return null;
}
