require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fetch = require("node-fetch");
const axios = require("axios");
const moment = require("moment");
const fs = require("fs");
const cbor = require("cbor");
const { Actor, HttpAgent } = require("@dfinity/agent");
const bot = new Telegraf(process.env.BOT_TOKEN);
const DATA_FILE = "data.json";
const { getOWWeatherUrl, getTelegramFileUrl, getCanisterCallUrl, API_BASE_URLS } = require("./config/api.js");

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

let idlFactory;
(async () => {
  const candid = await import("./icp-bindings/dao_backend/service.did.js");
  idlFactory = candid.idlFactory;
  const agent = new HttpAgent({ host: API_BASE_URLS.ICP_AGENT });
  await agent.fetchRootKey(); // Required for local dev

  const daoBackendActor = Actor.createActor(idlFactory, {
    agent,
    canisterId: "bkyz2-fmaaa-aaaaa-qaaaq-cai", // Replace with actual ID
  });

  // ✅ Now that the actor exists, define this function
  async function submitWeatherData(telegram_id, recipient_address, latitude, longitude, city, temperature, weather) {
    try {
      const submissionId = await daoBackendActor.submit_weather_data(
        telegram_id.toString(),
        recipient_address,
        latitude,
        longitude,
        city,
        temperature,
        weather
      );
      console.log("✅ Weather data submitted to ICP canister. Submission ID:", submissionId);
      return submissionId;
    } catch (err) {
      console.error("❌ Failed to submit data to canister:", err);
      return null;
    }
  }

  // ✅ Now that the actor exists, define this function
  async function createTgUser(telegram_id, first_name, last_name, username, language_code, is_bot) {
    try {
      const submissionId = await daoBackendActor.create_tg_user(
        telegram_id.toString(),
        first_name,
        last_name,
        username,
        language_code,
        is_bot
      );
      console.log("✅ User data submitted to ICP canister. Submission ID:", submissionId);
      return submissionId;
    } catch (err) {
      console.error("❌ Failed to submit user data to canister:", err);
      return null;
    }
  }

  // async function submitWeatherData(telegram_id, recipient_address, latitude, longitude, city, temperature, weather) {
  //   const canisterId = "bw4dl-smaaa-aaaaa-qaacq-cai";
  //   const url = getCanisterCallUrl(canisterId)
  //  `http://127.0.0.1:4943/api/v2/canister/${canisterId}/call`;

  // start by saving user's information into json
  // Welcome message upon /start command prompts users to share location
  bot.start(async ctx => {
    try {
      const user = ctx.message.from;
      const msg = "Welcome! " + user.username + " Please choose an option:" + console.log("User Info:", user);
      // calling backend ICP canister

      const response = await createTgUser(
        user.id,
        user.first_name,
        user.last_name,
        user.username,
        user.language_code,
        user.is_bot
      );
      console.log("📡 Response from backend canister:", response);
      ctx.reply(`✅ Weather data submitted successfully for ${city}.`);

      storedData = readData();

      // Check if the user already exists in data.json
      let userEntry = storedData.find(entry => entry.userId === user.id);
      if (!userEntry) {
        console.log("🆕 New user detected. Creating a new entry...");
        // grabbing user profile photo from Telegram API
        let profilePhotoUrl = "";
        try {
          // Get user profile photos
          const photos = await bot.telegram.getUserProfilePhotos(user.id, 0, 1);

          if (photos.total_count > 0) {
            const fileId = photos.photos[0][0].file_id; // Get the smallest version
            const file = await bot.telegram.getFile(fileId);
            profilePhotoUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file.file_path}`;
            console.log("🔗 Constructed profile photo URL:", profilePhotoUrl);
          }
        } catch (error) {
          console.error("❌ Failed to fetch profile photo:", error.message);
        }
        const userPayload = {
          userId: user.id,
          firstName: user.first_name,
          lastName: user.last_name || "",
          username: user.username || "",
          language: user.language_code || "",
          profilePhoto: profilePhotoUrl,
        };
        try {
          const response = await fetch(`${process.env.NGROK_URL}/save-user`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userPayload),
          });
          const result = await response.json();
          if (response.ok) {
            console.log("✅ User saved:", result.message);
          } else if (response.status === 409) {
            console.log("⚠️ User already exists:", result.message);
          } else {
            console.error("❌ Failed to save user:", result.error || result);
          }
        } catch (error) {
          console.error("🚨 Error calling /save-user:", error.message);
        }
      } else {
        console.log(`user: ${userEntry.userId}`);
      }
      ctx.reply(
        "Welcome! Choose an option:",
        Markup.keyboard([
          [
            Markup.button.locationRequest("📍 Share Location"),
            Markup.button.webApp("🔌 Connect TON Wallet", process.env.NGROK_URL + "/plug"),
          ], // Share location button
          [
            Markup.button.webApp("🏆 View Leaderboard", process.env.NGROK_URL + "/leaderboard"),
            Markup.button.webApp("🌎 CarbonSustain DAO", process.env.NGROK_URL + "/dao"),
          ], // Mini App button
        ]).resize()
      );
    } catch (error) {
      console.error("🚨 Error calling /save-user:", error.message);
    }
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
      if (distance <= TARGET_LOCATION.radiusMeters) {
        // Prevent awarding points if the last location was already inside the radius
        const lastLocation = userEntry?.locations[userEntry.locations.length - 1];

        // grabbing user profile photo from Telegram API
        let profilePhotoUrl = "";
        try {
          // Get user profile photos
          const photos = await bot.telegram.getUserProfilePhotos(userId, 0, 1);

          if (photos.total_count > 0) {
            const fileId = photos.photos[0][0].file_id; // Get the smallest version
            const file = await bot.telegram.getFile(fileId);
            profilePhotoUrl = getTelegramFileUrl(file.file_path);
            console.log("🔗 Constructed profile photo URL:", profilePhotoUrl);
          }
        } catch (error) {
          console.error("❌ Failed to fetch profile photo:", error.message);
        }

        const params = new URLSearchParams({
          lat: latitude,
          lon: longitude,
          appid: process.env.WEATHER_API_KEY,
          units: "imperial",
        });
        const weatherUrl = getOWWeatherUrl(params);
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
        if (!userEntry) {
          console.log("🆕 New user detected. Creating a new entry...");
          userEntry = {
            userId,
            firstName: user.first_name,
            lastName: user.last_name || "",
            username: user.username || "",
            language: user.language_code,
            profilePhoto: profilePhotoUrl || "",
            shareCount: 0,
            pointsCount: 0,
            locations: [],
          };
          storedData.push(userEntry);
        } else {
          console.log(`user: ${userEntry.userId}`);
        }
        if (distance <= TARGET_LOCATION.radiusMeters) {
          // Prevent awarding points if the last location was already inside the radius
          const lastLocation = userEntry?.locations[userEntry.locations.length - 1];
          if (!lastLocation || getDistance(lastLocation.latitude, lastLocation.longitude, latitude, longitude) > 5) {
            points += 1;
          }
        }
        // Set/update dynamic fields (applies to both new & returning users)
        userEntry.firstName = user.first_name;
        userEntry.lastName = user.last_name || "";
        userEntry.username = user.username || "";
        userEntry.language = user.language_code;

        // Update profile photo only if it's different from the saved one
        if (profilePhotoUrl && profilePhotoUrl !== userEntry.profilePhoto) {
          console.log("🔄 Updating profile photo URL...");
          userEntry.profilePhoto = profilePhotoUrl;
        }

        userEntry.shareCount = (userEntry.shareCount || 0) + 1;
        userEntry.pointsCount = (userEntry.pointsCount || 0) + points;

        // Log the points data
        console.log(`📍 Distance from target location: ${distance} meters`);
        console.log("📊 Points awarded to user for this entry: ", points);
        const timestamp = Date.now(); // Current timestamp

        // calling backend ICP canister
        const response = await submitWeatherData(
          userId,
          "b8063e98ee44802de4e40f2bb30820ebb2a4d5730dbbc8b95dbd7620e6941723", // replace with user's wallet address when that gets implemented
          latitude,
          longitude,
          city,
          temperature,
          weather
        );
        console.log("📡 Response from backend canister:", response);
        ctx.reply(`✅ Weather data submitted successfully for ${city}.`);

        // Add the new location to the user's location array in data.json
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
          submissionId: Number(response),
        };
        userEntry.locations.push(newLocation);

        // Save the updated data
        saveData(storedData);
        console.log("💾 Data saved:", userEntry);

        ctx.reply(
          `✅ Data Saved!\n📍 Location: ${city}\n🌡 Temperature: ${temperature}°F\n🌤 Weather: ${weather}\n🕰 Time: ${localTime}\n\nPlease send a photo to add to your submission!`
        );

        console.log("✅ Response sent to user!");
      }
    } catch (error) {
      console.error(error);
      console.error("❌ ERROR:", error);
      ctx.reply("⚠️ Failed to fetch weather data. Please try again later.");
    }
  });

  // ✅ Listen for wallet addresses
  bot.on("text", ctx => {
    console.log("bot hears wallet");
    const userId = ctx.message.from.id;
    const walletAddress = ctx.message.text.trim();
    console.log(`userID: ${userID}`);
    console.log(`wallet address: ${walletAddress}`);

    // Validate Plug Wallet format (Basic check: Plug Wallet starts with letters, numbers, and dashes)
    if (!/^[a-z0-9-]+$/.test(walletAddress)) {
      ctx.reply("❌ Invalid wallet address. Please check and try again.");
      return;
    }
    console.log("flow 1");
    let storedData = readData();
    let userEntry = storedData.find(entry => entry.userId === userId);
    console.log(`${userEntry}`);
    if (!userEntry) {
      console.log("flow 2");
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
      saveData(storedData);

      ctx.reply("📷 Photo saved with your last shared location!");
    } catch (error) {
      console.error("❌ ERROR:", error);
      ctx.reply("⚠️ Failed to save photo. Please try again.");
    }
  });

  bot.on("text", ctx => {
    console.log("bot hears wallet number2");
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
})();
