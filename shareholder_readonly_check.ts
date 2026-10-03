import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = "mobiflex-african";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

const db = getFirestore();

async function main() {
  const snapshot = await db
    .collection("shareholders")
    .where("kycApproved", "==", true)
    .get();

  console.log("");
  console.log("=== MOBIFLEX SHAREHOLDER READ-ONLY CHECK ===");
  console.log(`Approved shareholders found: ${snapshot.size}`);
  console.log("");

  if (snapshot.empty) {
    console.log("No KYC-approved shareholders found.");
    return;
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();

    const uid = String(data.uid ?? doc.id);
    const accountNumber =
      data.shareholderAccountNumber ??
      data.accountNumber ??
      "MISSING";

    const shares =
      data.shares ??
      data.shareholderShares ??
      0;

    const ownershipPercentage =
      data.ownershipPercentage ??
      data.percentage ??
      0;

    console.log(`UID: ${uid}`);
    console.log(`Account Number: ${accountNumber}`);
    console.log(`Shares: ${shares}`);
    console.log(`Ownership Percentage: ${ownershipPercentage}%`);
    console.log(`KYC Approved: ${data.kycApproved}`);
    console.log("--------------------------------------------");
  }

  console.log("");
  console.log("READ-ONLY CHECK COMPLETE.");
}

main().catch((error) => {
  console.error("");
  console.error("READ-ONLY CHECK FAILED:");
  console.error(error);
  process.exit(1);
});
