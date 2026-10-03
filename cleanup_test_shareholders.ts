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
  console.log("=== SAFE SHAREHOLDER TEST-DATA CLEANUP ===");
  console.log("");

  for (const uid of uids) {
    const shareholderRef = db.collection("shareholders").doc(uid);
    const kycRef = db.collection("shareholder_kyc").doc(uid);
    const userRef = db.collection("users").doc(uid);

    const [shareholderSnap, kycSnap, userSnap, ledgerSnap] =
      await Promise.all([
        shareholderRef.get(),
        kycRef.get(),
        userRef.get(),
        db
          .collection("shareholder_financial_ledger")
          .where("shareholderUid", "==", uid)
          .get(),
      ]);

    console.log(`UID: ${uid}`);
    console.log(`Shareholder exists: ${shareholderSnap.exists}`);
    console.log(`KYC exists: ${kycSnap.exists}`);
    console.log(`User exists: ${userSnap.exists}`);
    console.log(`Financial ledger records: ${ledgerSnap.size}`);

    if (ledgerSnap.size > 0) {
      throw new Error(
        `STOP: ${uid} has financial ledger history. No data was deleted.`,
      );
    }

    console.log("No shareholder financial history found.");
    console.log("");
  }

  console.log("Deleting stale/test shareholder records...");

  const batch = db.batch();

  for (const uid of uids) {
    batch.delete(db.collection("shareholders").doc(uid));
    batch.delete(db.collection("shareholder_kyc").doc(uid));
    batch.delete(db.collection("users").doc(uid));
  }

  await batch.commit();

  console.log("");
  console.log("CLEANUP COMPLETE.");
  console.log("Removed stale shareholder profile/KYC/user records.");
  console.log("No financial ledger records were deleted.");
  console.log("");
}

main().catch((error) => {
  console.error("");
  console.error("CLEANUP STOPPED:");
  console.error(error);
  process.exit(1);
});
