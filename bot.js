require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const bot = new Telegraf(process.env.BOT_TOKEN);
const DATA_FILE = "data.json";

// Function to read stored data from data.json
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  const rawData = fs.readFileSync(DATA_FILE);
  return JSON.parse(rawData);
};

// Function to save data to data.json
const saveData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// Welcome message upon /start command prompts users to share location
bot.start((ctx) => {
  ctx.reply(
    "Welcome! Please share your location to start.",
    Markup.keyboard([Markup.button.locationRequest("📍 Share Location")]).resize()
  );
});

// Handle User Location
bot.on("location", async (ctx) => {
    console.log("📍 Location received from Telegram!");
    try {
        const userId = ctx.message.from.id;
        const user = ctx.message.from;
        const { latitude, longitude } = ctx.message.location;
        console.log(`📍 Received location from ${user.first_name} (ID: ${userId}): Lat ${latitude}, Lon ${longitude}`);

        // Get weather data from OpenWeather API
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.WEATHER_API_KEY}&units=imperial`;
        console.log(`🌍 Fetching weather data from: ${weatherUrl}`);

        const weatherResponse = await axios.get(weatherUrl);
        const weatherData = weatherResponse.data;
        console.log(`✅ Weather Data Fetched:`, weatherData);

        const city = weatherData.name;
        const temperature = weatherData.main.temp;
        const weather = weatherData.weather[0].description;
    
        // Get local time
        const localTime = moment().utcOffset(weatherData.timezone / 60).format("YYYY-MM-DD HH:mm:ss");

        // Read existing data and update JSON file
        const storedData = readData();

        // Check if the user already exists in data.json
        let userEntry = storedData.find(entry => entry.userId === user.id);
        
        if (!userEntry) { // ✅ Only create new entry if user is completely new
            userEntry = {
                userId: user.id,
                firstName: user.first_name,
                lastName: user.last_name || "",
                username: user.username || "",
                language: user.language_code,
                profilePhoto: user.photo_url || "",
                shareCount: 1, // First time sharing location
                locations: []
            };
            storedData.push(userEntry);
        } else {
            userEntry.shareCount = (userEntry.shareCount || 0) + 1; // Ensure it always exists
            }

        // Add the new location data to the user's history
        userEntry.locations.push({
            latitude,
            longitude,
            city,
            temperature,
            weather,
            time: localTime
        });

        // Save the updated data
        saveData(storedData);

        console.log("💾 Data saved:", userEntry);

    // Respond to user
        ctx.reply(
            `✅ Data Saved!\n📍 Location: ${city}\n🌡 Temperature: ${temperature}°F\n🌤 Weather: ${weather}\n🕰 Time: ${localTime}`
        );

        console.log("✅ Response sent to user!");
    
    } catch (error) {
        console.error(error);
        console.error("❌ ERROR:", error);
        ctx.reply("⚠️ Failed to fetch weather data. Please try again later.");
    }
});

// Launch the bot
bot.launch();
console.log("🤖 Telegram bot is running...");