import { Router } from "express";
import { db } from "../db/db.js";
import { matches, createMatchSchema } from "../db/schema.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

// GET all matches
matchRouter.get("/", async (req, res) => {
    try {
        const allMatches = await db
            .select()
            .from(matches)
            .orderBy(desc(matches.createdAt));

        res.status(200).json(allMatches);
    } catch (error) {
        res.status(500).json({
            error: "Failed to fetch matches.",
            details: error.message,
        });
    }
});

// POST create match
matchRouter.post("/", async (req, res) => {
    try {
        // Validate request body
        const matchData = createMatchSchema.parse(req.body);

        // Insert into database
        const [newMatch] = await db
            .insert(matches)
            .values(matchData)
            .returning();

        // Broadcast to all WebSocket clients
        if (typeof req.app.locals.broadcastMatchCreated === "function") {
            req.app.locals.broadcastMatchCreated(newMatch);
        }

        res.status(201).json({
            message: "Match created successfully.",
            data: newMatch,
        });
    } catch (error) {
        res.status(500).json({
            error: "Failed to create match.",
            details: error.message,
        });
    }
});
