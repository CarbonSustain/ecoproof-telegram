require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const axios = require("axios");
const moment = require("moment");
const fs = require("fs");

const cbor = require("cbor");

const bot = new Telegraf(process.env.BOT_TOKEN);
const DATA_FILE = "data.json";

// Hardcoded location ETH Denver
const TARGET_LOCATION = {
  latitude: 39.782759,
  longitude: -104.969148,
  radiusMeters: 100, // Define the range in meters (adjust as needed)
};

// Function to calculate the distance between two coordinates (Haversine Formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const toRadians = degrees => degrees * (Math.PI / 180);
  const R = 6371000; // Earth's radius in meters
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

// Function to read stored data from data.json
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) return [];
  const rawData = fs.readFileSync(DATA_FILE);
  return JSON.parse(rawData);
};

// Function to save data to data.json
const saveData = data => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

async function submitWeatherData(telegram_id, recipient_address, latitude, longitude, city, temperature, weather) {
  const canisterId = "avqkn-guaaa-aaaaa-qaaea-cai&id=b77ix-eeaaa-aaaaa-qaada-cai"; // Replace with your actual canister ID
  const url = `http://127.0.0.1:4943/api/v2/canister/${canisterId}/call`;

  // Data payload with function parameters
  const payload = {
    canister_id: canisterId,
    method_name: "submit_weather_data",
    args: [telegram_id, recipient_address, latitude, longitude, city, temperature, weather],
  };

  // debugging
  console.log("payload before CBOR encoding:", JSON.stringify(payload, null, 2));

  // Send request to IC canister
  try {
    // Convert payload to CBOR
    const cborPayload = cbor.encode(payload);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/cbor" },
      body: cborPayload,
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    // Read and decode CBOR response
    const responseData = await response.arrayBuffer();
    const decodedResponse = cbor.decode(Buffer.from(responseData));
    console.log("Response from Canister:", decodedResponse);
    return decodedResponse;
  } catch (error) {
    console.error("Error submitting weather data:", error);
    return { error: error.message };
  }
}

const userStates = {}; // Store user actions before location sharing

// Welcome message upon /start command prompts users to share location
bot.start(ctx => {
  ctx.reply(
    "Welcome! Choose an option:",
    Markup.keyboard([
      [
        Markup.button.locationRequest("📍 Share Location"),
        Markup.button.webApp("🔌 Connect Plug Wallet", process.env.NGROK_URL + "/plug"),
      ], // Share location button
      [
        Markup.button.webApp("🏆 View Leaderboard", process.env.NGROK_URL + "/leaderboard"),
        Markup.button.webApp("🌎 CarbonSustain DAO", process.env.NGROK_URL + "/dao"),
      ], // Mini App button
    ]).resize()
  );
});

// Handle User Location
bot.on("location", async ctx => {
  console.log("📍 Location received from Telegram!");
  try {
    const chatId = ctx.chat.id;
    const userId = ctx.message.from.id;
    const user = ctx.message.from;
    const { latitude, longitude } = ctx.message.location;
    console.log(`📍 Received location from ${user.first_name} (ID: ${userId}): Lat ${latitude}, Lon ${longitude}`);

    const params = new URLSearchParams({
      lat: latitude,
      lon: longitude,
      appid: process.env.WEATHER_API_KEY,
      units: "imperial",
    });
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`;
    // Get weather data from OpenWeather API
    console.log(`🌍 Fetching weather data from: ${weatherUrl}`);

    const weatherResponse = await axios.get(weatherUrl);
    const weatherData = weatherResponse.data;
    console.log(`✅ Weather Data Fetched:`, weatherData);

    const city = weatherData.name;
    const temperature = weatherData.main.temp;
    const weather = weatherData.weather[0].description;

    // Get local time
    const localTime = moment()
      .utcOffset(weatherData.timezone / 60)
      .format("YYYY-MM-DD HH:mm:ss");
    const unixTime = moment().unix(); // Unix timestamp for comparison

    // Read existing data and update JSON file
    const storedData = readData();

    // Calculate points based on distance from target location
    const distance = getDistance(latitude, longitude, TARGET_LOCATION.latitude, TARGET_LOCATION.longitude);
    let points = 0;

    // Check if the user already exists in data.json
    let userEntry = storedData.find(entry => entry.userId === user.id);

    if (distance <= TARGET_LOCATION.radiusMeters) {
      // Prevent awarding points if the last location was already inside the radius
      const lastLocation = userEntry?.locations[userEntry.locations.length - 1];

      if (!lastLocation || getDistance(lastLocation.latitude, lastLocation.longitude, latitude, longitude) > 5) {
        points += 1;
      }
    }

    userEntry.userId = userId;
    userEntry.firstName = user.first_name;
    userEntry.lastName = user.last_name || "";
    userEntry.username = user.username || "";
    userEntry.language = user.language_code;
    userEntry.profilePhoto = user.photo_url || "";
    userEntry.locations = userEntry.locations || [];
    userEntry.shareCount = (userEntry.shareCount || 0) + 1;
    userEntry.pointsCount = (userEntry.pointsCount || 0) + points;

    // Log the points data
    console.log(`📍 Distance from target location: ${distance} meters`);
    console.log("📊 Points awarded to user for this entry: ", points);

    const timestamp = Date.now(); // Current timestamp

    // Add the new location data to the user's history
    const newLocation = {
      latitude,
      longitude,
      city,
      temperature,
      weather,
      time: localTime,
      unixTime,
      photoUrl: null,
      pointsEarned: points,
    };

    userEntry.locations.push(newLocation);

    // Save the updated data
    saveData(storedData);
    console.log("💾 Data saved:", userEntry);

    ctx.reply(
      `✅ Data Saved!\n📍 Location: ${city}\n🌡 Temperature: ${temperature}°F\n🌤 Weather: ${weather}\n🕰 Time: ${localTime}\n\nPlease send a photo to add to your submission!`
    );

    console.log("✅ Response sent to user!");

    const response = await submitWeatherData(
      userId,
      userEntry.walletAddress,
      latitude,
      longitude,
      city,
      temperature,
      weather
    );
    console.log("📡 Response from backend canister:", response);

    ctx.reply(`✅ Weather data submitted successfully for ${city}.`);
  } catch (error) {
    console.error(error);
    console.error("❌ ERROR:", error);
    ctx.reply("⚠️ Failed to fetch weather data. Please try again later.");
  }
});

// ✅ Listen for wallet addresses
bot.on("text", ctx => {
  const userId = ctx.message.from.id;
  const walletAddress = ctx.message.text.trim();

  // Validate Plug Wallet format (Basic check: Plug Wallet starts with letters, numbers, and dashes)
  if (!/^[a-z0-9-]+$/.test(walletAddress)) {
    ctx.reply("❌ Invalid wallet address. Please check and try again.");
    return;
  }
  let storedData = readData();
  let userEntry = storedData.find(entry => entry.userId === userId);
  if (!userEntry) {
    userEntry = {
      userId: userId,
      walletAddress: walletAddress,
    };
    storedData.push(userEntry);
  } else {
    userEntry.userId = userId;
    userEntry.walletAddress = walletAddress;
  }

  saveData(storedData);

  console.log(`✅ Wallet connected for user ${userId}: ${walletAddress}`);
  ctx.reply(`✅ Your Plug Wallet is now linked: ${walletAddress}`);
});

// ✅ Command to check saved wallet
bot.command("mywallet", ctx => {
  const userId = ctx.message.from.id;
  let storedData = readData();
  let userEntry = storedData.find(entry => entry.userId === userId);

  if (userEntry && userEntry.walletAddress) {
    ctx.reply(`🔗 Your Plug Wallet: ${userEntry.walletAddress}`);
  } else {
    ctx.reply("❌ No wallet linked. Please enter your Plug Wallet address.");
  }
});

bot.on("photo", async ctx => {
  try {
    const user = ctx.message.from;
    const userId = ctx.message.from.id;

    // Get the largest available photo file
    const photoArray = ctx.message.photo;
    const largestPhoto = photoArray[photoArray.length - 1]; // Highest resolution
    const fileId = largestPhoto.file_id;

    console.log(`📷 Received photo from user ${user.first_name}, File ID: ${fileId}`);

    // Read existing data
    const storedData = readData();
    let userEntry = storedData.find(entry => entry.userId === userId);

    if (!userEntry || userEntry.locations.length === 0) {
      return ctx.reply("⚠️ Please **share your location first** before sending a photo!");
    }

    let lastLocation = userEntry.locations[userEntry.locations.length - 1];
    const currentUnixTime = moment().unix(); // Get current Unix timestamp

    const timeDifference = currentUnixTime - lastLocation.unixTime; // Difference in seconds
    console.log(`🔍 Time since location: ${timeDifference} seconds`);

    if (timeDifference > 60) {
      return ctx.reply("⏳ Too much time has passed! Please share your location again before sending a photo.");
    }

    // Attach photo to the most recent location entry
    userEntry.locations[userEntry.locations.length - 1].photoUrl = fileId;

    // Save updated data
    saveData(storedData);

    ctx.reply("📷 Photo saved with your last shared location!");
  } catch (error) {
    console.error("❌ ERROR:", error);
    ctx.reply("⚠️ Failed to save photo. Please try again.");
  }
});

bot.on("text", ctx => {
  const walletAddress = ctx.message.text.trim();

  // Validate Plug Wallet format (Plug addresses contain letters, numbers, and dashes)
  if (!/^[a-z0-9-]+$/.test(walletAddress)) {
    ctx.reply("❌ Invalid wallet address. Please check and try again.");
    return;
  }

  console.log(`✅ Wallet connected for user ${ctx.message.from.id}: ${walletAddress}`);
  ctx.reply(`✅ Your Plug Wallet is now linked: ${walletAddress}`);
});

// Launch the bot
bot.launch();
console.log("🤖 Telegram bot is running...");
