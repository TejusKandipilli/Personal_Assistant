import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import { google } from "googleapis";
import AudioPaths from './paths/AudioPaths.js';  // Ensure .js is added if using ESModules
import ChatPaths from './paths/ChatPaths.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware

app.use(cors({
  origin: 'https://personal-assistant-frontend-vr7q.onrender.com',  // 👈 Match your frontend
  credentials: true   
}));
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,          // Your client ID
  process.env.CLIENT_SECRET,      // Your client secret
  process.env.REDIRECT_URI       // Your redirect URI
);
app.use(session({
  secret: process.env.SESSION_SECRET,      // 🔒 Used to sign the session ID cookie
  resave: false,                  // 🔄 Avoid resaving unchanged sessions
  saveUninitialized: false,       // 💾 Don't save empty sessions
  cookie: {
    maxAge: 1000 * 60 * 60  // ⏰ 1 day (in ms)
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


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

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    req.session.tokens = tokens;

    // ✅ Redirect to frontend success page
    res.redirect("http://localhost:5173/oauth-success");
  } catch (error) {
    console.error("Error exchanging code for tokens", error);
    res.redirect("http://localhost:5173/oauth-failure");
  }
});



app.use('/audio', AudioPaths);
app.use('/chat', ChatPaths);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
