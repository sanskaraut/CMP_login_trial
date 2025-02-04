const express = require("express"); 
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors());

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

let loggedInUser = null;

// Unified login routes
app.get("/login/:provider", (req, res) => {
  const provider = req.params.provider;
  let url = "";

  if (provider === "clever") {
    url = `https://clever.com/oauth/authorize?response_type=code&client_id=${CLEVER_CLIENT_ID}&redirect_uri=${CLEVER_REDIRECT_URI}`;
  } else if (provider === "google") {
    url = `https://accounts.google.com/o/oauth2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${GOOGLE_REDIRECT_URI}&response_type=code&scope=email%20profile`;
  } else if (provider === "canva") {
    url = `https://api.canva.com/oauth/authorize?client_id=${CANVA_CLIENT_ID}&redirect_uri=${CANVA_REDIRECT_URI}&response_type=code&scope=user.read`;
  } else if (provider === "classlink") {
    url = `https://launchpad.classlink.com/oauth2/v2/auth?response_type=code&client_id=${CLASSLINK_CLIENT_ID}&redirect_uri=${CLASSLINK_REDIRECT_URI}&scope=openid profile email`;
  } else {
    return res.status(400).send("Invalid provider");
  }

  res.redirect(url);
});

// OAuth callback handling
app.get("/callback/:provider", async (req, res) => {
  const provider = req.params.provider;
  const code = req.query.code;

  if (!code) return res.status(400).send("No authorization code provided.");

  try {
    let tokenUrl = "";
    let tokenData = {};
    let userInfoUrl = "";
    let headers = {};

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

    loggedInUser = userResponse.data;
    res.json({ message: "Login Successful", user: loggedInUser });
  } catch (error) {
    console.error("OAuth Error:", error);
    res.status(500).send("OAuth Login Failed.");
  }
});

// Get logged-in user
app.get("/getuser", (req, res) => {
  if (loggedInUser) {
    res.json(loggedInUser);
  } else {
    res.status(401).json({ message: "User not logged in" });
  }
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
