const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");

dotenv.config();
const app = express();

// Enable CORS with credentials so that session cookies can be exchanged
app.use(cors({
  origin: true, // Adjust to your allowed origins in production
  credentials: true
}));

app.use(express.json());

// Configure session management for per-client isolation
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set secure:true when using HTTPS in production
}));

const PORT = 3000;
const CLEVER_CLIENT_ID = process.env.CLEVER_CLIENT_ID;
const CLEVER_CLIENT_SECRET = process.env.CLEVER_CLIENT_SECRET;
const CLEVER_REDIRECT_URI = process.env.CLEVER_REDIRECT_URI;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI;
const CANVA_CLIENT_ID = process.env.CANVA_CLIENT_ID;
const CANVA_CLIENT_SECRET = process.env.CANVA_CLIENT_SECRET;
const CANVA_REDIRECT_URI = process.env.CANVA_REDIRECT_URI;
const CLASSLINK_CLIENT_ID = process.env.CLASSLINK_CLIENT_ID;
const CLASSLINK_CLIENT_SECRET = process.env.CLASSLINK_CLIENT_SECRET;
const CLASSLINK_REDIRECT_URI = process.env.CLASSLINK_REDIRECT_URI;

// Unified login route
app.get("/login/:provider", (req, res) => {
  const provider = req.params.provider;
  let url = "";

  if (provider === "clever") {
    url = `https://clever.com/oauth/authorize?response_type=code&client_id=${CLEVER_CLIENT_ID}&redirect_uri=${CLEVER_REDIRECT_URI}`;
  } else if (provider === "google") {
    // Append prompt=select_account to force a fresh login
    url = `https://accounts.google.com/o/oauth2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=email%20profile&prompt=select_account`;
  } else if (provider === "canva") {
    url = `https://api.canva.com/oauth/authorize?client_id=${CANVA_CLIENT_ID}&redirect_uri=${CANVA_REDIRECT_URI}&response_type=code&scope=user.read`;
  } else if (provider === "classlink") {
    url = `https://launchpad.classlink.com/oauth2/v2/auth?response_type=code&client_id=${CLASSLINK_CLIENT_ID}&redirect_uri=${CLASSLINK_REDIRECT_URI}&scope=openid%20profile%20email`;
  } else {
    return res.status(400).send("Invalid provider");
  }

  res.redirect(url);
});

// OAuth callback handling with session storage
app.get("/callback/:provider", async (req, res) => {
  const provider = req.params.provider;
  const code = req.query.code;

  if (!code) return res.status(400).send("No authorization code provided.");

  try {
    let tokenUrl = "";
    let tokenData = {};
    let userInfoUrl = "";
    let headers = {};
    app.listen(PORT, () => console.log(`Login Request came from${provider}`));
    if (provider === "clever") {
      tokenUrl = "https://clever.com/oauth/tokens";
      tokenData = {
        code,
        client_id: CLEVER_CLIENT_ID,
        client_secret: CLEVER_CLIENT_SECRET,
        redirect_uri: CLEVER_REDIRECT_URI,
        grant_type: "authorization_code",
      };
      userInfoUrl = "https://api.clever.com/v1.1/me";
    } else if (provider === "google") {
      tokenUrl = "https://oauth2.googleapis.com/token";
      tokenData = {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      };
      userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
    } else if (provider === "canva") {
      tokenUrl = "https://api.canva.com/oauth/token";
      tokenData = {
        code,
        client_id: CANVA_CLIENT_ID,
        client_secret: CANVA_CLIENT_SECRET,
        redirect_uri: CANVA_REDIRECT_URI,
        grant_type: "authorization_code",
      };
      userInfoUrl = "https://api.canva.com/v1/users/me";
    } else if (provider === "classlink") {
      tokenUrl = "https://launchpad.classlink.com/oauth2/v2/token";
      tokenData = {
        code,
        client_id: CLASSLINK_CLIENT_ID,
        client_secret: CLASSLINK_CLIENT_SECRET,
        redirect_uri: CLASSLINK_REDIRECT_URI,
        grant_type: "authorization_code",
      };
      userInfoUrl = "https://launchpad.classlink.com/oauth2/v2/userinfo";
    } else {
      return res.status(400).send("Invalid provider");
    }

    const tokenResponse = await axios.post(tokenUrl, tokenData);
    const accessToken = tokenResponse.data.access_token;

    headers = { Authorization: `Bearer ${accessToken}` };
    const userResponse = await axios.get(userInfoUrl, { headers });

    // Save the user's login information in the session for this client.
    req.session.user = userResponse.data;

    // Instead of deep linking, display a webpage message
    res.send(`
      <html>
        <head>
          <title>Login Successful</title>
        </head>
        <body>
          <h1>Login Successful</h1>
          <p>Please open your VR app to continue.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth Error:", error);
    res.status(500).send("OAuth Login Failed.");
  }
});

// GET endpoint to retrieve the logged-in user for this session
app.get("/get-user", (req, res) => {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.status(401).json({ message: "User not logged in" });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
