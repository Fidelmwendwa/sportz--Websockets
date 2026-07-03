import express from "express";

const app = express();
const PORT = 8000;

// Middleware
app.use(express.json());

// Root route
app.get("/", (req, res) => {
    res.status(200).json({
        message: "Sportz Live API is running",
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
