const fs = require("fs");
const path = require("path");
const { GoogleAuth } = require("google-auth-library");
const { initializeApp, getApps } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const PROJECT_ID = "mobiflex-african";
const SERVICE_ACCOUNT =
  "firebase-adminsdk-fbsvc@mobiflex-african.iam.gserviceaccount.com";
const EMAIL = "noelmtalika35@gmail.com";

if (getApps().length === 0) {
  initializeApp({
    projectId: PROJECT_ID,
    credential: new GoogleAuth({
      scopes: [
        "https://www.googleapis.com/auth/cloud-platform",
      ],
    }),
  });
}

async function main() {
  const auth = getAuth();
  const db = getFirestore();

  const user = await auth.getUserByEmail(EMAIL);
  const userSnap = await db.collection("users").doc(user.uid).get();

  if (!userSnap.exists) {
    throw new Error(`users/${user.uid} does not exist.`);
  }

  const userData = userSnap.data() || {};
  const role = String(userData.role || "").toLowerCase();

  if (!role.includes("super") || !role.includes("admin")) {
    throw new Error(
      `users/${user.uid}.role is "${role}", not Super Admin.`
    );
  }

  const customToken = await auth.createCustomToken(user.uid, {
    role: "super_admin",
  });

  let apiKey = null;

  const files = [
    "C:\\src\\mobiflex_super_admin\\lib\\firebase_options.dart",
    "C:\\src\\mobiflex_manager\\lib\\firebase_options.dart",
    "C:\\src\\mobiflex_customer\\lib\\firebase_options.dart",
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;

    const content = fs.readFileSync(file, "utf8");
    const match = content.match(/apiKey\s*:\s*['"]([^'"]+)['"]/);

    if (match) {
      apiKey = match[1];
      break;
    }
  }

  if (!apiKey) {
    throw new Error("Firebase Web API key not found.");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      }),
    }
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(
      `Firebase token exchange failed (${response.status}): ${body}`
    );
  }

  const result = JSON.parse(body);

  if (!result.idToken) {
    throw new Error("Firebase ID token was not returned.");
  }

  console.log("");
  console.log("TOKEN CREATED SUCCESSFULLY.");
  console.log("");
  console.log("Copy the ID token for the local test.");
  console.log("");
  console.log(result.idToken);
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("LOCAL TOKEN HELPER ERROR:");
  console.error(error.message || error);
  process.exit(1);
});
