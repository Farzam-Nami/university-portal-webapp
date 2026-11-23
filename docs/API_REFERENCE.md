# API Reference

All API responses use JSON unless a route returns an HTML page or a redirect.

## Page Routes

| Method | Route | Description |
|---|---|---|
| GET | `/` | Landing page |
| GET | `/login` | Login page |
| GET | `/signup` | Registration page |
| GET | `/dashboard` | Authenticated dashboard |
| GET | `/profile` | Authenticated profile page |
| GET | `/courses` | Semester course page |
| GET | `/food-reservation` | Food reservation page |
| GET | `/financial` | Financial page |
| GET | `/news` | Announcements page |
| GET | `/news-detail?id=news1` | Announcement details |
| GET | `/requests` | Student requests page |
| GET | `/logout` | End the current session |

## Authentication

### `POST /signup`

Creates a new user account.

Expected JSON fields:

```json
{
  "username": "student01",
  "email": "student@example.com",
  "password": "your-password",
  "studentId": "STU-1001",
  "major": "Computer Engineering",
  "faculty": "Faculty of Engineering",
  "nationalId": "0000000000",
  "firstName": "Alex",
  "lastName": "Student",
  "birthDate": "2002-04-15"
}
```

The password is hashed before it is stored.

### `POST /login`

Authenticates a user and sets the session cookie.

Expected JSON fields:

```json
{
  "username": "student01",
  "password": "your-password"
}
```

### `GET /check-session`

Returns whether the current request has an active session.

## Profile

### `PUT /api/profile`

Updates editable profile fields for the signed-in user.

### `PUT /api/password`

Changes the password after validating the current password.

Expected JSON fields:

```json
{
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

## Food Reservations

| Method | Route | Description |
|---|---|---|
| GET | `/api/food/balance` | Get the signed-in user's balance |
| POST | `/api/food/increase-balance` | Add funds |
| POST | `/api/food/reserve` | Create a reservation |
| GET | `/api/food/reservations` | List the user's active reservations |
| DELETE | `/api/food/cancel` | Cancel a reservation |
| PUT | `/api/food/edit` | Edit a reservation |
| GET | `/api/food/check-reservation?date=YYYY-MM-DD&mealType=lunch` | Check an existing reservation |

## Courses

| Method | Route | Description |
|---|---|---|
| GET | `/api/courses/semesters` | List available semesters |
| GET | `/api/courses/semester/:semester` | Get courses for a semester |

## Finance

| Method | Route | Description |
|---|---|---|
| GET | `/api/financial/debt` | Get the signed-in user's debt |
| POST | `/api/financial/settle-debt` | Settle the signed-in user's debt |

## Requests

| Method | Route | Description |
|---|---|---|
| GET | `/api/requests` | List requests belonging to the signed-in user |
| POST | `/api/requests` | Create a request |
| GET | `/api/requests/:id` | Get a request after ownership validation |

## Database Function Reference

The following functions are exported by `db.js`.

### Connection and Courses

- `connectToDatabase()` — connects to MongoDB and returns the configured database.
- `getCurrentSemesterCourses()` — gets courses from the latest available semester.
- `getAllCourses()` — returns all course records.
- `getCoursesBySemester(semester)` — returns courses for the requested semester.
- `getAllSemesters()` — returns the available semesters in academic order.
- `getScoresBySemester()` — calculates average scores by semester.
- `getTodaysCourses()` — returns current-semester courses scheduled for the current weekday.

### Users and Profiles

- `getUserProfile(username)` — retrieves a user profile without the password hash.
- `updateUserProfile(username, profileData)` — updates the permitted profile fields.
- `updateUserPassword(username, hashedNewPassword)` — stores a new password hash.
- `validateUserPassword(username, hashedPassword)` — validates a supplied password hash against the stored account hash.

### Food and Balances

- `getUserBalance(username)` — gets a user's current balance.
- `updateUserBalance(username, amount)` — changes a user's balance.
- `initializeFoodMenu()` — inserts the generic menu if the collection is empty.
- `getFoodMenu()` — returns available food items.
- `makeReservation(username, reservationData)` — creates a food reservation.
- `getUserReservations(username)` — lists active reservations for a user.
- `checkExistingReservation(username, date, mealType)` — checks for a reservation on a date and meal.
- `cancelReservation(username, reservationId)` — cancels a reservation owned by the user.
- `editReservation(username, reservationId, newReservationData)` — updates a reservation owned by the user.

### Financial Records

- `getUserDebt(username)` — retrieves a user's outstanding debt.
- `updateUserDebt(username, amount)` — updates a user's debt.
- `settleDebt(username)` — settles the user's debt using the available balance.

### Requests

- `createRequest(username, requestData)` — creates a request for the signed-in user.
- `getUserRequests(username)` — returns requests belonging to the user.
- `getRequestById(requestId)` — retrieves a request by its MongoDB identifier.
- `updateRequestStatus(requestId, status)` — updates a request status.
