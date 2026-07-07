import { Router } from "express";
import { db } from "../db/db.js";
import { matches, createMatchSchema } from "../db/schema.js";
import { desc } from "drizzle-orm";

export const matchRouter = Router();

// GET all matches
matchRouter.get("/", async (req, res) => {
    try {
        const limit = Math.min(Number(req.query.limit) || 100, 1000);
        const offset = Number(req.query.offset) || 0;

        const allMatches = await db
            .select()
            .from(matches)
            .orderBy(desc(matches.createdAt))
            .limit(limit)
            .offset(offset);

        res.status(200).json(allMatches);
    } catch (error) {
        console.error("Failed to fetch matches:", error);
        res.status(500).json({
            error: "Failed to fetch matches.",
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
        console.error("Failed to create match:", error);
        res.status(500).json({
            error: "Failed to create match.",
        });
    }
});
