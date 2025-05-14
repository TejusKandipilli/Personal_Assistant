import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import { google } from "googleapis";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import AudioPaths from './paths/AudioPaths.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;

// Set up PostgreSQL session store
const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Render requires SSL
  },
});

// Middleware
app.use(cors({
  origin: 'https://personal-assistant-alpha.vercel.app',
  credentials: true,
}));

app.use(session({
  store: new PgSession({
    pool: pgPool,
    tableName: 'session', // Optional: use your own table name
  }),
  secret: process.env.SESSION_SECRET || 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // True if deployed
    maxAge: 1000 * 60 * 60 * 24, // 1 day
  },
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Google OAuth
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

// Routes
app.get("/auth", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/tasks",
      "https://www.googleapis.com/auth/gmail.modify",
      "https://www.googleapis.com/auth/gmail.compose",
    ],
  });
  res.redirect(authUrl);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect("https://personal-assistant-alpha.vercel.app");

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;
    res.redirect("https://personal-assistant-alpha.vercel.app/oauth-success");
  } catch (err) {
    console.error("OAuth error:", err);
    res.redirect("https://personal-assistant-alpha.vercel.app");
  }
});

app.use('/audio', AudioPaths);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
