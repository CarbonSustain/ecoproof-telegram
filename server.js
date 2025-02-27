// the api route to get leaderboard data

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(express.static("public"));
const PORT = process.env.PORT || 3000; // Fetch PORT from .env, fallback to 3000 if undefined

const DATA_FILE = "data.json";

// Function to read and sort leaderboard
const getLeaderboard = () => {
    if (!fs.existsSync(DATA_FILE)) return [];
    const rawData = fs.readFileSync(DATA_FILE);
    const users = JSON.parse(rawData);

    // Sort users by highest points
    return users.sort((a, b) => b.pointsCount - a.pointsCount);
};

// to avoid the ngrok browser warning
app.use((req, res, next) => {
    res.setHeader('ngrok-skip-browser-warning', 'true');
    next();
});


// API Route to get leaderboard data
app.get("/leaderboard", (req, res) => {
    const leaderboard = getLeaderboard().map(user => ({
        firstName: user.firstName,
        username: user.username || "N/A",
        shareCount: user.shareCount || 0,
        pointsCount: user.pointsCount || 0
    }));

    res.json(leaderboard);
});

// Start the server
app.listen(PORT, () => {
    console.log(`🌍 Server running at http://localhost:${PORT}`);
});
