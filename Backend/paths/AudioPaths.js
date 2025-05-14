import express from "express";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import session from "express-session";
import { google } from "googleapis";  // Import Google API client
dotenv.config();

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/transcribe", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    req.session.count = (req.session.count || 0) + 1;
    console.log(req.session.count);
    const { buffer, originalname, mimetype, size } = req.file;
    console.log("File Details:", { originalname, mimetype, size });

    const base64AudioFile = buffer.toString("base64");

    const contents = [
      { text: `You are a helpful assistant. Based on the audio input, do the following:

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
      ` },
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
    console.log(fullText)
    // Split plain text from JSON string (assumes JSON starts at first "{")
    const jsonStartIndex = fullText.indexOf("{");
    const plainTextPart = fullText.slice(0, jsonStartIndex).trim();
    const jsonString = fullText.slice(jsonStartIndex).trim();

    let parsedJson = {};
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (parseErr) {
      console.error("JSON parsing failed:", parseErr);
    }

    // Extract events, tasks, and emails from the parsed JSON
    const events = parsedJson.events || [];
    const tasks = parsedJson.tasks || [];
    const mailList = parsedJson.maillist || [];

    // Google Calendar API authentication
    const oauth2Client = new google.auth.OAuth2(
      process.env.CLIENT_ID,
      process.env.CLIENT_SECRET,
      process.env.REDIRECT_URI
    );

    oauth2Client.setCredentials(req.session.tokens);

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const tasksAPI = google.tasks({ version: "v1", auth: oauth2Client });
    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    // Add events to Google Calendar (All-Day Events)
    for (const event of events) {
      const { event_name, date } = event;
      const eventDetails = {
        summary: event_name,
        start: {
          date: date,  // Use only 'date' for all-day event
          timeZone: "UTC",
        },
        end: {
          date: date,  // Use only 'date' for all-day event
          timeZone: "UTC",
        },
      };

      try {
        const calendarEvent = await calendar.events.insert({
          calendarId: "primary",
          resource: eventDetails,
        });
        console.log(`All-Day Event created: ${calendarEvent.data.summary} on ${calendarEvent.data.start.date}`);
      } catch (error) {
        console.error("Error creating calendar event:", error);
      }
    }

    // Add tasks to Google Tasks
    for (const task of tasks) {
      const { title, notes, due, status } = task;

      const taskDetails = {
        title,
        notes,
        due: due ? new Date(due).toISOString() : undefined,
        status,
      };

      try {
        const taskCreated = await tasksAPI.tasks.insert({
          tasklist: "@default", // Default task list
          resource: taskDetails,
        });
        console.log(`Task created: ${taskCreated.data.title}`);
      } catch (error) {
        console.error("Error creating task:", error);
      }
    }

    // Create draft emails in Gmail
    for (const mail of mailList) {
      const { to, subject, body } = mail;

      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        "",
        body,
      ].join("\n");

      const encodedEmail = Buffer.from(email).toString("base64url");

      const draft = {
        message: {
          raw: encodedEmail,
        },
      };

      try {
        const createdDraft = await gmail.users.drafts.create({
          userId: "me", // 'me' refers to the authenticated user
          resource: draft,
        });
        console.log(`Draft email created to ${to} with subject "${subject}"`);
      } catch (error) {
        console.error("Error creating draft email:", error);
      }
    }

    res.json({
      replyText: plainTextPart,
      result: parsedJson,
    });
  } catch (err) {
    console.error("Error in transcription:", err);
    res.status(500).json({ error: "Transcription failed" });
  }
});

router.post("/upload", async (req, res) => {
  res.send({ message: "Okay" });
});

export default router;
