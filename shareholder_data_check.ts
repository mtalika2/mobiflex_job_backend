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
  const snapshot = await db
    .collection("shareholders")
    .where("kycApproved", "==", true)
    .get();

  console.log("");
  console.log("=== APPROVED SHAREHOLDER DATA CHECK ===");
  console.log(`Count: ${snapshot.size}`);
  console.log("");

  for (const doc of snapshot.docs) {
    const data = doc.data();

    console.log(
      JSON.stringify(
        {
          docId: doc.id,
          uid: data.uid ?? null,
          name: data.name ?? data.fullName ?? null,
          email: data.email ?? null,
          country: data.country ?? null,
          shares:
            data.shares ??
            data.shareholderShares ??
            0,
          ownershipPercentage:
            data.ownershipPercentage ??
            data.percentage ??
            0,
          accountNumber:
            data.accountNumber ??
            data.shareholderAccountNumber ??
            null,
        },
        null,
        2,
      ),
    );

    console.log("--------------------------------------------");
  }

  console.log("");
  console.log("READ-ONLY CHECK COMPLETE.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
