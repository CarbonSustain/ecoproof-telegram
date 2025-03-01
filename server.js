// the api route to get leaderboard data

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");


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

app.use("/leaderboard", express.static(path.join(__dirname, "public/leaderboard")));
app.use("/dao", express.static(path.join(__dirname, "public/dao")));


// API Route to get leaderboard data
app.get("/api/leaderboard", (req, res) => {
    const leaderboard = getLeaderboard().map(user => ({
        firstName: user.firstName,
        username: user.username || "N/A",
        shareCount: user.shareCount || 0,
        pointsCount: user.pointsCount || 0
    }));

    res.json(leaderboard);
});

app.get("/submissions", (req, res) => {
    if (!fs.existsSync(DATA_FILE)) return res.json({ active: [], rewarded: [] });
    
    const rawData = fs.readFileSync(DATA_FILE);
    const users = JSON.parse(rawData);

    let active = [];
    let rewarded = [];
    
    // ✅ Loop through each user (since data.json is an array)
    users.forEach(user => {
        if (user.locations && Array.isArray(user.locations)) {
            user.locations.forEach(location => {
                // ✅ Structure each location as a submission
                const submission = {
                    userId: user.userId,  
                    username: user.username || "Unknown",
                    city: location.city || "Unknown City",
                    latitude: location.latitude,
                    longitude: location.longitude,
                    temperature: location.temperature || "N/A",
                    weather: location.weather || "Unknown",
                    time: location.time,
                    photoUrl: location.photoUrl || "",
                    pointsEarned: location.pointsEarned || 0
                };

                // ✅ Filter based on `pointsEarned`
                if (location.pointsEarned === 0) {
                    active.push(submission);
                } else {
                    rewarded.push(submission);
                }
            });
        }    
    });
    res.json({ active, rewarded });
})

// Start the server
app.listen(PORT, () => {
    console.log(`🌍 Server running at http://localhost:${PORT}`);
    console.log(`Leaderboard MiniApp running at http://localhost:${PORT}/leaderboard`)
    console.log(`CarbonSustainDAO MiniApp running at http://localhost:${PORT}/dao`)
});
