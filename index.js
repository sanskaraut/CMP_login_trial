const express = require("express"); 
const axios = require("axios");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
app.use(cors());

const PORT = 3000;
const CLIENT_IDS = {
    clever: process.env.CLEVER_CLIENT_ID,
    google: process.env.GOOGLE_CLIENT_ID,
    canva: process.env.CANVA_CLIENT_ID,
    classlink: process.env.CLASSLINK_CLIENT_ID,
};

const CLIENT_SECRETS = {
    clever: process.env.CLEVER_CLIENT_SECRET,
    google: process.env.GOOGLE_CLIENT_SECRET,
    canva: process.env.CANVA_CLIENT_SECRET,
    classlink: process.env.CLASSLINK_CLIENT_SECRET,
};

const REDIRECT_URIS = {
    clever: process.env.CLEVER_REDIRECT_URI,
    google: process.env.GOOGLE_REDIRECT_URI,
    canva: process.env.CANVA_REDIRECT_URI,
    classlink: process.env.CLASSLINK_REDIRECT_URI,
};

let loggedInUser = null;

app.get("/login/:provider", (req, res) => {
    const provider = req.params.provider;
    let authUrl = "";

    if (provider in CLIENT_IDS) {
        authUrl = getAuthUrl(provider);
    } else {
        return res.status(400).send("Invalid provider");
    }

    res.redirect(authUrl);
});

function getAuthUrl(provider) {
    const clientId = CLIENT_IDS[provider];
    const redirectUri = REDIRECT_URIS[provider];

    const authUrls = {
        clever: `https://clever.com/oauth/authorize?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}`,
        google: `https://accounts.google.com/o/oauth2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`,
        canva: `https://api.canva.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=user.read`,
        classlink: `https://launchpad.classlink.com/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&scope=openid profile email`,
    };

    return authUrls[provider];
}

app.get("/callback/:provider", async (req, res) => {
    const provider = req.params.provider;
    const code = req.query.code;

    if (!code) return res.status(400).send("No authorization code provided.");

    try {
        const tokenUrl = getTokenUrl(provider);
        const tokenData = {
            code,
            client_id: CLIENT_IDS[provider],
            client_secret: CLIENT_SECRETS[provider],
            redirect_uri: REDIRECT_URIS[provider],
            grant_type: "authorization_code",
        };

        const tokenResponse = await axios.post(tokenUrl, tokenData);
        const accessToken = tokenResponse.data.access_token;

        const userInfoUrl = getUserInfoUrl(provider);
        const headers = { Authorization: `Bearer ${accessToken}` };

        const userResponse = await axios.get(userInfoUrl, { headers });
        loggedInUser = userResponse.data;

        res.send(`
            <html>
                <body>
                    <h1>Login Successful</h1>
                    <p>You have successfully logged in. Redirecting to Unity...</p>
                    <script>
                        function showConfirmationDialog() {
                            if (confirm("Login Successful. Do you want to return to Unity?")) {
                                window.location.href = "cmpvrapp://open";
                            }
                        }
                        setTimeout(() => {
                            showConfirmationDialog();
                        }, 1000);
                        setTimeout(() => {
                            window.location.href = "cmpvrapp://open";
                        }, 6000);
                    </script>
                </body>
            </html>
        `);
    } catch (error) {
        console.error("OAuth Error:", error);
        res.status(500).send("OAuth Login Failed.");
    }
});

function getTokenUrl(provider) {
    const tokenUrls = {
        clever: "https://clever.com/oauth/tokens",
        google: "https://oauth2.googleapis.com/token",
        canva: "https://api.canva.com/oauth/token",
        classlink: "https://launchpad.classlink.com/oauth2/v2/token",
    };
    return tokenUrls[provider];
}

function getUserInfoUrl(provider) {
    const userInfoUrls = {
        clever: "https://api.clever.com/v1.1/me",
        google: "https://www.googleapis.com/oauth2/v2/userinfo",
        canva: "https://api.canva.com/v1/users/me",
        classlink: "https://launchpad.classlink.com/oauth2/v2/userinfo",
    };
    return userInfoUrls[provider];
}

app.get("/getuser", (req, res) => {
    if (loggedInUser) {
        res.json(loggedInUser);
    } else {
        res.status(401).send("No user logged in.");
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
