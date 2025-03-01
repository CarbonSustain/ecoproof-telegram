document.addEventListener("DOMContentLoaded", async () => {
  const connectWalletButton = document.getElementById("connectWallet");
  const walletAddressDisplay = document.getElementById("walletAddress");

  connectWalletButton.addEventListener("click", () => {
    if (isMobile()) {
      connectPlugWalletMobile(); // Mobile connection
    } else {
      connectPlugWalletBrowser(); // Desktop connection
    }
  });

  // Function to check if the user is on a mobile device
  function isMobile() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android|iphone|ipad|ipod/i.test(userAgent);
  }

  // Function to check if inside Telegram WebView
  function isTelegramWebView() {
    return navigator.userAgent.toLowerCase().includes("telegram");
  }

  // Function to check if Plug Wallet is installed (Desktop only)
  function isPlugInstalled() {
    return window.ic && window.ic.plug ? true : false;
  }

  // Function to connect Plug Wallet
  async function connectPlugWalletBrowser() {
    if (!(await isPlugInstalled())) {
      alert("Plug Wallet is not installed. Please install it first.");
      return;
    }

    try {
      // Request connection to Plug Wallet
      const isConnected = await window.ic.plug.requestConnect({
        whitelist: ["br5f7-7uaaa-aaaaa-qaaca-cai"], // Replace with your actual canister ID
        host: "https://ic0.app",
      });

      if (!isConnected) {
        alert("Failed to connect to Plug Wallet.");
        return;
      }

      // Retrieve the principal ID (wallet address)
      const principalId = await window.ic.plug.getPrincipal();
      if (!principalId) {
        throw new Error("Could not retrieve principal ID.");
      }

      walletAddressDisplay.textContent = `Wallet: ${principalId}`;
      console.log("Connected to Plug Wallet:", principalId);
      sendWalletToTelegramBot(principalId);
    } catch (error) {
      console.error("Error connecting to Plug Wallet:", error);
      alert("An error occurred while connecting to Plug Wallet.");
    }
  }

  async function connectPlugWalletMobile() {
    if (!isMobile()) {
      alert("This function is only for mobile devices.");
      return;
    }

    // Show the wallet input field in the Mini App
    document.getElementById("walletPrompt").style.display = "block";
  }

  function sendWalletToTelegramBot(walletAddress) {
    const telegramUser = window.Telegram.WebApp.initDataUnsafe.user;
    if (!telegramUser) {
      alert("⚠️ Cannot send wallet address. Telegram user not detected.");
      return;
    }
    
    const botApiUrl = "https://api.telegram.org/bot7830025691:AAFByMGesCZjxJUs14lcRzfV_pFhFC_jjXA/sendMessage"; // Replace with your bot's API URL
    const chatId = telegramUser.id; // Get the Telegram user ID


// ✅ Handle wallet address submission
submitWallet.addEventListener("click", () => {
    const walletAddress = walletInput.value.trim();
    if (!walletAddress) {
        alert("❌ Please enter a valid Plug Wallet address.");
        return;
      }

      // ✅ Send wallet address to Telegram bot
      sendWalletToTelegramBot(walletAddress);

      // ✅ Hide the input box after submission
      walletPrompt.style.display = "none";
      alert("✅ Wallet address submitted successfully!");
    });

    fetch(botApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔗 Wallet connected: ${walletAddress}`,
      }),
    })
      .then(response => response.json())
      .then(data => console.log("📡 Wallet sent to Telegram bot:", data))
      .catch(error => console.error("❌ Error sending wallet:", error));
  }
});

// ✅ Detect when the keyboard opens on iOS and move the input box up
walletInput.addEventListener("focus", () => {
  console.log("⌨️ Keyboard opened, moving elements up...");
  walletPrompt.style.position = "absolute";
  walletPrompt.style.bottom = "70vh"; // Moves the input field higher
});

// ✅ Reset position when the keyboard closes
walletInput.addEventListener("blur", () => {
  console.log("⌨️ Keyboard closed, resetting elements...");
  walletPrompt.style.position = "fixed";
  walletPrompt.style.bottom = "20vh";
});

document.getElementById("submitWallet").addEventListener("click", async () => {
  // Ensure the Telegram Web Apps API is available
  const tg = window.Telegram.WebApp;
  const walletAddress = document.getElementById("walletInput").value.trim();

  if (walletAddress) {
    try {
      // Close the Telegram MiniApp and return to the bot
      tg.close();
    } catch (error) {
      console.error("Error submitting wallet address:", error);
      alert("Failed to submit wallet address. Please try again.");
    }
  } else {
    alert("Please enter a valid Plug Wallet address.");
  }
});
