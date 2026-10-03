import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: "mobiflex-african",
  });
}

const db = getFirestore();

async function main() {
  const uids = [
    "Qb9sBnyW6dUtmUvyja1UtxVyNts2",
    "evu7dIps20Ym2lHfsLUg04ZF6yf2",
  ];

  console.log("");
  console.log("=== SHAREHOLDER USERS RECORD CHECK ===");
  console.log("");

  for (const uid of uids) {
    const ref = db.collection("users").doc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      console.log(`UID: ${uid}`);
      console.log("users record: MISSING");
    } else {
      const data = snap.data() ?? {};

      console.log(
        JSON.stringify(
          {
            uid,
            exists: true,
            name: data.name ?? data.fullName ?? null,
            email: data.email ?? null,
            role: data.role ?? null,
            accountType: data.accountType ?? null,
            status: data.status ?? null,
            accountStatus: data.accountStatus ?? null,
            kycStatus: data.kycStatus ?? null,
            kycApproved: data.kycApproved ?? null,
            accountNumber:
              data.accountNumber ??
              data.shareholderAccountNumber ??
              null,
            shares:
              data.shares ??
              data.shareholderShares ??
              null,
            ownershipPercentage:
              data.ownershipPercentage ??
              data.percentage ??
              null,
          },
          null,
          2,
        ),
      );
    }

    console.log("--------------------------------------------");
  }

  console.log("");
  console.log("READ-ONLY USERS CHECK COMPLETE.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
