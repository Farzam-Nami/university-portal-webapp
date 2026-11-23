# Architecture

## Overview

The application uses a small Node.js HTTP server with a MongoDB data-access module and a browser-based frontend.

```text
Browser
  |
  | HTTP requests and form submissions
  v
server.js
  |
  | page routing, authentication, request handling
  v
db.js
  |
  | MongoDB Node.js Driver
  v
MongoDB
```

## Backend

### `server.js`

`server.js` creates the HTTP server using Node.js built-in modules. It is responsible for:

- Serving the public HTML, CSS, JavaScript, and image files
- Handling registration and login
- Creating and checking login sessions
- Loading profile and dashboard pages with account-specific values
- Handling profile and password updates
- Handling food reservations, course queries, financial operations, and student requests

The server uses explicit route conditions. This keeps the routing approach close to the original project structure.

### `db.js`

`db.js` contains the MongoDB connection and database operations. It groups the database logic for:

- Course and semester queries
- User profiles and passwords
- Account balances
- Food menus and reservations
- User debts
- Student requests

The database connection reads `MONGODB_URI` and `MONGODB_DB` from the process environment.

## Frontend

The frontend is located in `public/`.

| File | Responsibility |
|---|---|
| `index.html` | Public landing page |
| `login.html` | Login form |
| `signup.html` | Registration form |
| `dashboard.html` | Student dashboard |
| `profile.html` | Profile and password settings |
| `courses.html` | Semester courses and weekly schedule |
| `food-reservation.html` | Food selection and reservation management |
| `financial.html` | Account balance and debt information |
| `news.html` | Announcements and personal messages |
| `news-detail.html` | Full announcement content |
| `requests.html` | Request submission and tracking |
| `styles.css` | Shared page styling |
| `sidebar.js` | Shared navigation behavior |
| `courses.js` | Course table and weekly schedule behavior |
| `food-reservation.js` | Food reservation and date picker behavior |

The frontend uses plain HTML, CSS, and browser JavaScript. No frontend framework or build step is required.

## Request Flow

1. The browser requests a page or API endpoint.
2. `server.js` checks the route and, where necessary, validates the session.
3. Database operations are delegated to functions in `db.js`.
4. The server returns HTML or JSON.
5. Frontend JavaScript updates the page using the returned data.

## Session Handling

Login sessions are stored in the server process memory and identified by a random token in an HTTP-only cookie. A server restart clears active sessions, so users must sign in again.
