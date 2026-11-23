# University Portal

A student academic portal built with Node.js, MongoDB, HTML, CSS, and JavaScript. The application provides account registration and login, student profile management, course information, food reservations, financial records, announcements, and student requests.

## Features

- Student registration and login
- Password hashing with `bcrypt`
- Profile information and password management
- Student dashboard
- Semester course list and weekly schedule
- Food menu and reservation management
- Account balance and debt management
- Announcements and personal messages
- Student request submission and tracking
- MongoDB persistence

## Technology Stack

- **Backend:** Node.js built-in HTTP server
- **Database:** MongoDB
- **Database Driver:** MongoDB Node.js Driver
- **Authentication:** `bcrypt`
- **Session Cookie Parsing:** `cookie`
- **Frontend:** HTML5, CSS3, and vanilla JavaScript

## Project Structure

```text
university-portal-web/
├── public/
│   ├── index.html
│   ├── login.html
│   ├── signup.html
│   ├── dashboard.html
│   ├── profile.html
│   ├── courses.html
│   ├── food-reservation.html
│   ├── financial.html
│   ├── news.html
│   ├── news-detail.html
│   ├── requests.html
│   ├── styles.css
│   ├── sidebar.js
│   ├── courses.js
│   ├── food-reservation.js
│   └── back_img.jpg
├── docs/
│   ├── API_REFERENCE.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   └── TEST_REPORT.md
├── tests/
│   └── project.test.js
├── db.js
├── server.js
├── package.json
├── package-lock.json
└── .gitignore
```

## Requirements

- Node.js 18 or later
- npm
- MongoDB 6 or later

## Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd university-portal-web
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Start MongoDB locally, or provide a MongoDB connection string from your own MongoDB deployment.

4. Configure the environment variables.

   **PowerShell:**

   ```powershell
   $env:MONGODB_URI = "mongodb://127.0.0.1:27017"
   $env:MONGODB_DB = "universityPortal"
   $env:PORT = "3001"
   ```

   **macOS / Linux:**

   ```bash
   export MONGODB_URI="mongodb://127.0.0.1:27017"
   export MONGODB_DB="universityPortal"
   export PORT="3001"
   ```

5. Start the application:

   ```bash
   npm start
   ```

6. Open the application:

   ```text
   http://localhost:3001
   ```

For development with automatic server restarts:

```bash
npm run dev
```

## Database Setup

The application connects to MongoDB using:

- `MONGODB_URI`: MongoDB connection string
- `MONGODB_DB`: database name

If these variables are not provided, the application uses the local MongoDB server at `mongodb://127.0.0.1:27017` and the database name `universityPortal`.

No MongoDB database export, user records, student records, or database backup is included in this repository. The database is created by MongoDB when the application first writes data. The application initializes the generic food menu when the `foodMenu` collection is empty.

There are no default user accounts. Register a new account through the Sign Up page.

The `courses` collection is not preloaded with student records or academic history. Course data can be added to the MongoDB database used by the person running the application.

See [Database Documentation](docs/DATABASE.md) for collection details.

## Main Pages

| Page | URL |
|---|---|
| Home | `/` |
| Login | `/login` |
| Sign Up | `/signup` |
| Dashboard | `/dashboard` |
| Profile | `/profile` |
| Semester Courses | `/courses` |
| Food Reservation | `/food-reservation` |
| Payments & Finance | `/financial` |
| Messages & Announcements | `/news` |
| Announcement Details | `/news-detail?id=news1` |
| Requests | `/requests` |

Authenticated pages require a valid login session.

## API Overview

The application exposes endpoints for authentication, profile management, food reservations, courses, financial operations, and student requests.

The complete route and function reference is available in [API Reference](docs/API_REFERENCE.md).

## Tests

Run the repository checks with:

```bash
npm test
```

The test suite checks source-language consistency, required frontend files, project configuration, and the absence of local database files and dependency folders from the repository.

JavaScript syntax can also be checked with:

```bash
node --check server.js
node --check db.js
```

## Notes

- User accounts and application records are stored in the MongoDB instance configured by the person running the project.
- Passwords are stored as `bcrypt` hashes.
- The current session store is held in server memory. Active sessions are cleared when the server process restarts.
- The Jalali date picker uses English transliterations for month names and stores selected dates in Gregorian ISO format.
- Financial amounts are represented in Toman.
