# EcoProof Telegram Bot

This is the backend for the EcoProof Bot on Telegram.

## Prerequisites

Before running the bot, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [ngrok](https://download.ngrok.com/) (For exposing local server to the internet)

## Running the Backend

To run the backend for the bot, follow these steps:

### 1 Install Dependencies
Run the following command in the project directory:
```sh
 npm install
```

### 2 Setup Configuration Files

#### **Create `.env` File**
Inside the project directory, create a `.env` file with the following keys:
```env
BOT_TOKEN= "<token here>"
WEATHER_API_KEY= "<API key here>"
PORT= <port number here>
NGROK_AUTH_TOKEN= "<ngrok token here for future use>"
NGROK_URL= "<generated url here>"
```

## Setting Up ngrok

ngrok is used to expose the local server to the internet. Follow these steps:

### 1️⃣ Download and Install ngrok
- Download ngrok from [ngrok’s official website](https://download.ngrok.com/).
- Follow the installation guide for your operating system.

### 2️⃣ Authenticate ngrok
Once installed, authenticate ngrok by adding your authentication token:
```sh
 ngrok config add-authtoken <your-auth-token>
```
Get your auth token from [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken).
Optionally, update the .env file

### 3️⃣ Start ngrok Tunnel
In the first terminal, navigate to the project directory and run:
```sh
 ngrok http $PORT
```
Replace `$PORT` with the port number from your `.env` file. For example, if PORT=3000:
```sh
 ngrok http 3000
```
This will generate a public URL, which you should use for the Telegram WebApp.
Make sure to update the .env file with the chosen port

## Running the Bot

You'll need **three terminal windows** to run the bot correctly:

### **Terminal 1: Start ngrok**
```sh
 ngrok http $PORT
```
Copy the generated public URL and use it in the bot configuration.
Just paste the URL in the placeholder in the .env file

### **Terminal 2: Run the Backend**
Navigate to the project directory and start the backend server:
```sh
 npm install  # Only required for the first run
 npm start
```
This runs the Express.js backend for handling leaderboard requests.

### **Terminal 3: Start the Bot**
Run the bot using:
```sh
 node bot.js
```
This starts the Telegram bot, allowing it to interact with users.

## Testing the Bot
Once everything is running:
1. Open Telegram and start a chat with your bot by searching for: @ReadWeatherBot
2. Use `/start` to interact with it.
3. Share your location and use the leaderboard feature to access the mini app.

## Troubleshooting
- Ensure that `.env` is properly configured.
- If ngrok generates a new URL on restart, update your bot’s configuration with the new link.
- Check the console logs for any errors.

🚀 Now you’re all set to run the EcoProof Telegram bot!
