# Database Documentation

## Connection Settings

The MongoDB connection is configured with environment variables:

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://127.0.0.1:27017` | MongoDB connection string |
| `MONGODB_DB` | `universityPortal` | Database name |

No database export or local database file is included in the repository. MongoDB creates the database and collections when the application first writes data.

## Collections

### `users`

Stores registered accounts and student profile information.

Main fields:

- `username`
- `email`
- `password` — bcrypt password hash
- `studentId`
- `major`
- `faculty`
- `nationalId`
- `firstName`
- `lastName`
- `birthDate`
- `createdAt`
- `updatedAt`

The profile update function only accepts editable profile fields. The username and academic identity fields are not updated through the profile form.

### `courses`

Stores course information used by the semester list, dashboard, and weekly schedule.

Expected fields:

- `name`
- `semester`
- `professor`
- `units`
- `classTime`
- `examDate`
- `score`

`classTime` uses English weekday names and comma-separated sessions, for example:

```text
Monday 08:00-10:00, Wednesday 10:00-12:00
```

`examDate` should use the Gregorian ISO date format `YYYY-MM-DD`.

The repository does not include student course records or academic history. The collection is empty until course data is added to the MongoDB database used by the application.

### `foodMenu`

Stores the available food items.

Main fields:

- `mealType`
- `name`
- `price`
- `image`

The application inserts a generic menu when this collection is empty.

### `userBalances`

Stores the available balance for each username.

### `reservedMeals`

Stores food reservations.

Main fields:

- `username`
- `cafeteria`
- `date`
- `mealType`
- `foodName`
- `price`
- `createdAt`
- `status`

### `userDebts`

Stores outstanding debt information for each username.

### `requests`

Stores student requests.

Main fields:

- `id`
- `username`
- `title`
- `recipient`
- `description`
- `hasFile`
- `status`
- `date`
- `createdAt`
- `updatedAt`

## Data Privacy

The repository contains database access code, not a database export. It does not include user records, student records, account balances, payment history, or database backups.

Each person running the application should use their own MongoDB instance and database.
