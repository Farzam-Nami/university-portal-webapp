# Security and Privacy

## Repository Contents

The repository does not contain:

- MongoDB database files or database exports
- User accounts or student records
- Personal academic history
- Payment history or account balances
- `.env` files or deployment secrets
- `node_modules` or local logs

The `db.js` file is application source code that connects to MongoDB and performs database operations. It is not a database export.

## Password Storage

Passwords are hashed with `bcrypt` before they are saved in the `users` collection. The application does not store plaintext passwords.

## Session Cookies

After successful login, the server creates a cryptographically random session token and sends it in an HTTP-only cookie with `SameSite=Lax`. The `Secure` attribute is enabled when `NODE_ENV=production`.

Sessions are stored in server memory. They are cleared when the server process restarts.

## User Data

Each person running the project should configure their own MongoDB database. No default user account or personal database is distributed with the source code.

## Deployment Considerations

For an internet-facing deployment:

- Serve the application over HTTPS.
- Set `NODE_ENV=production`.
- Use a managed session store if sessions must survive server restarts or multiple server instances.
- Restrict MongoDB network access and use a database account with appropriate permissions.
- Add request rate limiting and CSRF protection before using the application with real accounts.
- Do not use this coursework application to store sensitive real-world student records without a full security and privacy review.
