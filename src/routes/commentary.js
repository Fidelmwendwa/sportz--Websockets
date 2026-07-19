import { Router } from "express";
import { ZodError } from "zod";
import { desc, eq } from "drizzle-orm";
import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import {
    createCommentarySchema,
    listCommentaryQuerySchema,
} from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

export const commentaryRouter = Router({ mergeParams: true });

const MAX_LIMIT = 100;

// GET commentary for a match
commentaryRouter.get("/", async (req, res) => {
    try {
        const { id: matchId } = matchIdParamSchema.parse(req.params);
        const { limit } = listCommentaryQuerySchema.parse(req.query);

        const safeLimit = Math.min(limit ?? MAX_LIMIT, MAX_LIMIT);

        const commentaryItems = await db
            .select()
            .from(commentary)
            .where(eq(commentary.matchId, matchId))
            .orderBy(desc(commentary.createdAt))
            .limit(safeLimit);

        res.status(200).json(commentaryItems);
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: "Invalid commentary query.",
                issues: error.issues,
            });
        }

        console.error("Failed to fetch commentary:", error);

        return res.status(500).json({
            error: "Failed to fetch commentary.",
        });
    }
});

// POST commentary for a match
commentaryRouter.post("/", async (req, res) => {
    try {
        const { id: matchId } = matchIdParamSchema.parse(req.params);

        const commentaryData = createCommentarySchema.parse(req.body);

        const [newCommentary] = await db
            .insert(commentary)
            .values({
                ...commentaryData,
                matchId,
            })
            .returning();

        res.status(201).json({
            message: "Commentary created successfully.",
            data: newCommentary,
        });

        // Broadcast commentary to subscribed WebSocket clients after persistence succeeds.
        try {
            if (typeof req.app.locals.broadcastCommentary === "function") {
                req.app.locals.broadcastCommentary(
                    newCommentary.matchId,
                    newCommentary
                );
            }
        } catch (broadcastError) {
            console.error("Failed to broadcast commentary:", broadcastError);
        }
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                error: "Invalid commentary payload.",
                issues: error.issues,
            });
        }

        console.error("Failed to create commentary:", error);

        return res.status(500).json({
            error: "Failed to create commentary.",
        });
    }
});
