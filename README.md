# Aethera Backend API

The server that powers **Project Aethera**, a social photo-sharing app for Android. It handles accounts, posts, comments, likes, follows, notifications, and short-lived statuses, and it stores everything in MySQL while serving uploaded images straight from disk.

![Node.js](https://img.shields.io/badge/Node.js-20%2B-3DDC84)
![Express](https://img.shields.io/badge/Express-5.2-000000)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1)
![License](https://img.shields.io/badge/license-MIT-blue)

## What It Does

Someone installs the Android app and creates an account with a username, email address and password. The app sends those details here, and this server creates the row, hashes the password with bcrypt, and returns the new account. Logging in works the same way in reverse: the app sends the credentials, this server compares the submitted password against the stored hash, and either returns the account or rejects the attempt.

From there the app becomes a photo feed. The phone uploads one or several images as multipart form data, this server writes them to disk and stores the paths against a new post, and the feed endpoint then serves a page of posts at a time so the app never has to download the whole history. Other people can like a post, leave comments, or be mentioned in one, and each of those actions creates a row and a notification for the person involved.

The app also keeps a live count of unread notifications and of comment totals, which it polls while it is open. When someone follows another person, the relationship is stored as a row and their posts begin appearing in the feed. Statuses are the short-lived counterpart to posts: they expire after a fixed window, are only visible to mutual followers, and track their own views and likes separately.

## Features

**For people using the app**

- Register and log in with a hashed password
- Reset a forgotten password through an emailed code
- Publish posts with one or many images
- Browse the feed page by page
- Like, comment on and mention people in posts
- Follow and unfollow other users, and search for them
- Receive notifications for likes, comments, mentions and new followers
- Post and view statuses that expire after 24 hours
- Track unread notification counts and comment totals

**For developers running the service**

- Every endpoint is protected by a shared-secret header checked in middleware
- Passwords are hashed with bcrypt using a per-user salt
- Verification codes expire after fifteen minutes
- Foreign keys with cascading deletes keep related rows consistent
- Composite indexes on user and expiry columns keep the hot queries fast
- Connection details, the API key and the SMTP password all come from environment variables
- A health endpoint reports whether the service and its handlers are ready

## How It's Built

The service is a Node.js application on Express 5. Requests arrive at a route file, which forwards to a controller holding the actual logic; the controller talks to MySQL through the mysql2 driver and returns JSON. A small middleware runs ahead of every route and rejects any request that is missing the correct API key, so authentication happens once rather than being repeated in each handler.

Configuration is separated by concern: the database connection, the mail transport, the authentication middleware and the shared notification helpers each live in their own file. SQL schema changes are kept as versioned scripts, so a fresh database can be brought up to date by running them in order. Uploaded files are written to disk and served back as static content, which keeps large binary files out of the database and out of the JSON responses.

## Tech Stack

| | |
|---|---|
| **Runtime** | Node.js 20+, CommonJS |
| **Framework** | Express 5 |
| **Database** | MySQL 8 via mysql2, with foreign keys and composite indexes |
| **Authentication** | bcryptjs hashing, shared-secret API key middleware |
| **Email** | Nodemailer over SMTP, for password reset codes |
| **File handling** | Multer for multipart uploads, static hosting for served files |
| **Cross-origin** | CORS, configured to allow the client's credentials header |
| **Configuration** | Environment variables loaded from a local `.env` file |

## Running the Project

Clone the repository, install the dependencies with `npm install`, and copy the example environment file to `.env` and fill in your MySQL details, an API key and an SMTP account. Create the database named in that file, then run the SQL scripts in the `sql` folder against it. Start the service with `npm start` and it will listen on port 8000, or on the port you set. The Android client is a separate repository and needs the same API key in its own configuration so the two agree.

## License

MIT. See the `LICENSE` file for the full text.

## Author

**Anuoluwapo Majekobaje Emmanuel** (马杰)

International student in China · Computer Science · Nanchang University

Built as an independent full-stack project to design and deliver a working REST API, relational data model and Android client end to end.
