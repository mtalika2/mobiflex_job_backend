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
  console.log("=== SHAREHOLDER FINANCIAL HISTORY CHECK ===");
  console.log("");

  for (const uid of uids) {
    console.log(`UID: ${uid}`);
    console.log("--------------------------------------------");

    const ledgerSnap = await db
      .collection("shareholder_financial_ledger")
      .where("shareholderUid", "==", uid)
      .get();

    console.log(`Ledger records: ${ledgerSnap.size}`);

    for (const doc of ledgerSnap.docs) {
      const data = doc.data();

      console.log(JSON.stringify({
        documentId: doc.id,
        paymentId: data.paymentId ?? null,
        transactionId: data.transactionId ?? null,
        applicationId: data.applicationId ?? null,
        grossPaymentAmount: data.grossPaymentAmount ?? null,
        mobiFlexRevenue: data.mobiFlexRevenue ?? null,
        allocatedAmount: data.allocatedAmount ?? null,
        ownershipPercentage: data.ownershipPercentage ?? null,
        status: data.status ?? null,
        verified: data.verified ?? null,
        createdAt: data.createdAt ?? null,
      }, null, 2));
    }

    console.log("");
  }

  console.log("=== CHECKING ALL SHAREHOLDER LEDGER RECORDS ===");
  console.log("");

  const allLedgerSnap = await db
    .collection("shareholder_financial_ledger")
    .get();

  console.log(`Total ledger records: ${allLedgerSnap.size}`);

  for (const doc of allLedgerSnap.docs) {
    const data = doc.data();

    console.log(JSON.stringify({
      documentId: doc.id,
      shareholderUid: data.shareholderUid ?? null,
      shareholderAccountNumber: data.shareholderAccountNumber ?? null,
      ownershipPercentage: data.ownershipPercentage ?? null,
      allocatedAmount: data.allocatedAmount ?? null,
      paymentId: data.paymentId ?? null,
      applicationId: data.applicationId ?? null,
      status: data.status ?? null,
    }, null, 2));
  }

  console.log("");
  console.log("READ-ONLY FINANCIAL HISTORY CHECK COMPLETE.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
