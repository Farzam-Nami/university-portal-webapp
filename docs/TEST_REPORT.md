# Test Report

## Automated Repository Tests

Run:

```bash
npm test
```

The built-in Node.js test suite checks:

- Required frontend and backend files are present.
- HTML, CSS, JavaScript, and JSON source files contain no Persian-script text.
- Local database files, database exports, `.env` files, and `node_modules` are not part of the repository.
- The package scripts and environment-based MongoDB configuration are present.
- The public page files referenced by the server are available.

## JavaScript Syntax Checks

Run:

```bash
node --check server.js
node --check db.js
node --check public/sidebar.js
node --check public/courses.js
node --check public/food-reservation.js
```

## Manual Application Checks

After starting MongoDB and running `npm start`, use the browser to check:

1. Landing page and navigation.
2. User registration and login.
3. Profile loading and profile updates.
4. Password changes.
5. Course and semester pages.
6. Food menu, balance, reservation, cancellation, and editing.
7. Financial information.
8. Announcements and announcement details.
9. Request submission and request history.

The automated repository tests do not replace these application-level checks. Database-backed workflows require a running MongoDB instance.
