import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import session from 'express-session';
import { google } from "googleapis";
import AudioPaths from './paths/AudioPaths.js';  // Ensure .js is added if using ESModules

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware

app.use(cors({
  origin: 'https://personal-assistant-alpha.vercel.app',  // 👈 Match your frontend
  credentials: true   
}));
const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,          // Your client ID
  process.env.CLIENT_SECRET,      // Your client secret
  process.env.REDIRECT_URI       // Your redirect URI
);
app.use(session({
  secret: "most_top_secret",      // 🔒 Used to sign the session ID cookie
  resave: false,                  // 🔄 Avoid resaving unchanged sessions
  saveUninitialized: false,       // 💾 Don't save empty sessions
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // ⏰ 1 day (in ms)
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
  console.log(code)
  if (!code) {
    console.error("OAuth2 callback error: No code received.");
    return res.redirect("https://personal-assistant-alpha.vercel.app");  // Handle failure appropriately
  }

  try {
    // Exchange the authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    // Set the tokens to OAuth2 client for future requests
    oauth2Client.setCredentials(tokens);

    // Store tokens in session (ensure session is properly set up)
    req.session.tokens = tokens;

    console.log("Tokens received and session set:", tokens); // For debugging purposes

    // Redirect the user to a success page on the frontend
    res.redirect("https://personal-assistant-alpha.vercel.app/oauth-success");
  } catch (error) {
    console.error("Error exchanging code for tokens", error);

    // If an error occurs, redirect to a failure page on the frontend
    res.redirect("https://personal-assistant-alpha.vercel.app");
  }
});




app.use('/audio', AudioPaths);

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server started on http://localhost:${PORT}`);
});
