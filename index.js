const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");
const session = require("express-session");
const jwt = require("jsonwebtoken");

dotenv.config();
const app = express();

// Enable CORS with credentials – in production, restrict origins appropriately.
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "https://your-production-domain.com",
  credentials: true
}));

app.use(express.json());

// Configure session management (used during OAuth flow)
// In a JWT solution the session is less critical for protecting endpoints.
app.use(session({
  secret: 'your-secret-key', // Replace with a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Set secure:true when using HTTPS in production
}));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-very-secure-secret';

// OAuth configuration variables
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

// OAuth callback handling with JWT
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
        grant_type: "authorization_code"
      };
      userInfoUrl = "https://api.clever.com/v1.1/me";
    } else if (provider === "google") {
      tokenUrl = "https://oauth2.googleapis.com/token";
      tokenData = {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code"
      };
      userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
    } else if (provider === "canva") {
      tokenUrl = "https://api.canva.com/oauth/token";
      tokenData = {
        code,
        client_id: CANVA_CLIENT_ID,
        client_secret: CANVA_CLIENT_SECRET,
        redirect_uri: CANVA_REDIRECT_URI,
        grant_type: "authorization_code"
      };
      userInfoUrl = "https://api.canva.com/v1/users/me";
    } else if (provider === "classlink") {
      tokenUrl = "https://launchpad.classlink.com/oauth2/v2/token";
      tokenData = {
        code,
        client_id: CLASSLINK_CLIENT_ID,
        client_secret: CLASSLINK_CLIENT_SECRET,
        redirect_uri: CLASSLINK_REDIRECT_URI,
        grant_type: "authorization_code"
      };
      userInfoUrl = "https://launchpad.classlink.com/oauth2/v2/userinfo";
    } else {
      return res.status(400).send("Invalid provider");
    }

    const tokenResponse = await axios.post(tokenUrl, tokenData);
    const accessToken = tokenResponse.data.access_token;
    headers = { Authorization: `Bearer ${accessToken}` };
    const userResponse = await axios.get(userInfoUrl, { headers });

    // Store user data in the session if needed (for fallback or logging)
    req.session.user = userResponse.data;

    // Generate a JWT that securely encapsulates the user's data.
    const jwtToken = jwt.sign({ user: userResponse.data }, JWT_SECRET, { expiresIn: '1h' });

    // Return an HTML page with the JWT and a copy-to-clipboard button.
    res.send(`
      <html>
        <head>
          <title>Login Successful</title>
          <script>
            function copyToken() {
              var tokenText = document.getElementById("token").innerText;
              navigator.clipboard.writeText(tokenText)
                .then(() => { alert("Token copied to clipboard!"); })
                .catch((err) => { alert("Failed to copy token: " + err); });
            }
          </script>
        </head>
        <body>
          <h1>Login Successful</h1>
          <p>Your JWT token is:</p>
          <pre id="token">${jwtToken}</pre>
          <button onclick="copyToken()">Copy Token to Clipboard</button>
          <p>Please open your VR app to continue.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth Error:", error);
    res.status(500).send("OAuth Login Failed.");
  }
});

// Middleware to verify JWT on protected endpoints.
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });
  
  const token = authHeader.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.user = decoded.user;
    next();
  });
}

// GET endpoint to retrieve the logged-in user's info via JWT.
app.get("/get-user", verifyJWT, (req, res) => {
  res.json(req.user);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
