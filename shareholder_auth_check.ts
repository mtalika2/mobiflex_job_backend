import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "mobiflex-african",
  });
}

const auth = getAuth();

async function main() {
  const uids = [
    "Qb9sBnyW6dUtmUvyja1UtxVyNts2",
    "evu7dIps20Ym2lHfsLUg04ZF6yf2",
  ];

  console.log("");
  console.log("=== SHAREHOLDER AUTH DUPLICATE CHECK ===");
  console.log("");

  for (const uid of uids) {
    try {
      const user = await auth.getUser(uid);

      console.log(
        JSON.stringify(
          {
            uid: user.uid,
            email: user.email ?? null,
            displayName: user.displayName ?? null,
            disabled: user.disabled,
            emailVerified: user.emailVerified,
            creationTime: user.metadata.creationTime ?? null,
            lastSignInTime: user.metadata.lastSignInTime ?? null,
          },
          null,
          2,
        ),
      );
    } catch (error) {
      console.log(
        JSON.stringify(
          {
            uid,
            error: error instanceof Error ? error.message : String(error),
          },
          null,
          2,
        ),
      );
    }

    console.log("--------------------------------------------");
  }

  console.log("");
  console.log("READ-ONLY AUTH CHECK COMPLETE.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
