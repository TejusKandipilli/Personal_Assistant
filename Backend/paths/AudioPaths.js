import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import session from "express-session";
import { google } from "googleapis";
import { Pool } from "pg";

dotenv.config();

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = multer.memoryStorage();
const upload = multer({ storage });

// PostgreSQL pool setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Function to get OAuth tokens from the session table
async function getTokensFromSession(sessionId) {
  const { rows } = await pool.query(
    'SELECT * FROM "session" WHERE "sid" = $1',
    [sessionId]
  );

  if (rows.length > 0) {
    const sessionData = rows[0].sess;
    return sessionData.tokens || null; // Assuming tokens are stored in the 'tokens' field
  }
  return null;
}

// Function to update OAuth tokens in the session table
async function updateTokensInSession(sessionId, tokens) {
  await pool.query(
    'UPDATE "session" SET "sess" = jsonb_set("sess", \'{tokens}\', $1::jsonb) WHERE "sid" = $2',
    [JSON.stringify(tokens), sessionId]
  );
}

// Transcription route
router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    const sessionId = req.sessionID;  // Using session ID from Express session
    if (!sessionId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Fetch tokens from the session table using sessionId
    const tokens = await getTokensFromSession(sessionId);

    if (!tokens) {
      return res.status(400).json({ error: "OAuth tokens not found in session" });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oauth2Client.setCredentials(tokens);

    const currentTime = Date.now();
    if (currentTime >= tokens.expiry_date) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        await updateTokensInSession(sessionId, credentials);
        console.log("Token refreshed and updated in session table.");
        oauth2Client.setCredentials(credentials);
      } catch (err) {
        console.error("Token refresh failed:", err);
        return res.status(500).json({ error: "Failed to refresh access token" });
      }
    }

    const { buffer, originalname, mimetype, size } = req.file;
    const base64AudioFile = buffer.toString("base64");

    const contents = [
      {
        text: `You are a helpful assistant. Based on the audio input, do the following:

1. Write a friendly and conversational summary in a section titled "Reply:" — this should sound natural.

In addition, return a structured JSON string in the following format:

{
  "tasks": [
    {
      "title": "Task title",
      "notes": "Task description",
      "due": "YYYY-MM-DD",
      "status": "needsAction"
    }
  ],
  "events": [
    {
      "event_name": "Event title",
      "date": "YYYY-MM-DD"
    }
  ],
  "maillist": [
    {
      "to": "recipient@example.com",
      "subject": "Email subject",
      "body": "Email body content"
    }
  ]
}

Important:
- First, output the plain text sections for Reply and Tasks.
- Then, output the JSON string on a new line (starting and ending with curly braces).
- Do not include transcript or use any formatting like symbols, markdown, or code blocks.
        `,
      },
      {
        inlineData: {
          mimeType: mimetype,
          data: base64AudioFile,
        },
      },
    ];

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: contents,
    });

    const fullText = response?.text || "No output received";
    const jsonStartIndex = fullText.indexOf("{");
    const plainTextPart = fullText.slice(0, jsonStartIndex).trim();
    const jsonString = fullText.slice(jsonStartIndex).trim();

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("JSON parsing failed:", parseErr);
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const tasksAPI = google.tasks({ version: "v1", auth: oauth2Client });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    const { events = [], tasks = [], maillist = [] } = parsedJson;

    for (const event of events) {
      const { event_name, date } = event;
      if (!date || !event_name) continue;

      const eventDetails = {
        summary: event_name,
        start: { date, timeZone: "UTC" },
        end: { date, timeZone: "UTC" },
      };

      try {
        const calendarEvent = await calendar.events.insert({
          calendarId: "primary",
          resource: eventDetails,
        });
        console.log(`Event created: ${calendarEvent.data.summary}`);
      } catch (error) {
        console.error("Calendar error:", error);
      }
    }

    for (const task of tasks) {
      const { title, notes, due, status } = task;
      if (!title) continue;

      const taskDetails = {
        title,
        notes,
        due: due ? new Date(due).toISOString() : undefined,
        status,
      };

      try {
        const createdTask = await tasksAPI.tasks.insert({
          tasklist: "@default",
          resource: taskDetails,
        });
        console.log(`Task created: ${createdTask.data.title}`);
      } catch (error) {
        console.error("Task error:", error);
      }
    }

    for (const mail of maillist) {
      const { to, subject, body } = mail;
      if (!to || !subject || !body) continue;

      const email = [`To: ${to}`, `Subject: ${subject}`, "", body].join("\n");
      const encodedEmail = Buffer.from(email).toString("base64url");

      try {
        const draft = await gmail.users.drafts.create({
          userId: "me",
          resource: { message: { raw: encodedEmail } },
        });
        console.log(`Draft email created to ${to}`);
      } catch (error) {
        console.error("Gmail error:", error);
      }
    }

    res.json({
      replyText: plainTextPart,
      result: parsedJson,
    });
  } catch (err) {
    console.error("Transcription error:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.post("/upload", async (req, res) => {
  res.send({ message: "Okay" });
});

export default router;
