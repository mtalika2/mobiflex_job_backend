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
  console.log("=== SHAREHOLDER CREATION / KYC HISTORY CHECK ===");
  console.log("");

  for (const uid of uids) {
    const shareholderSnap = await db
      .collection("shareholders")
      .doc(uid)
      .get();

    const kycSnap = await db
      .collection("shareholder_kyc")
      .doc(uid)
      .get();

    const shareholder = shareholderSnap.data() ?? {};
    const kyc = kycSnap.data() ?? {};

    console.log(JSON.stringify({
      uid,
      shareholder: {
        createdAt: shareholder.createdAt ?? null,
        updatedAt: shareholder.updatedAt ?? null,
        status: shareholder.status ?? null,
        kycStatus: shareholder.kycStatus ?? null,
        kycApproved: shareholder.kycApproved ?? null,
        createdBy: shareholder.createdBy ?? null,
        createdByEmail: shareholder.createdByEmail ?? null,
        accountNumber:
          shareholder.accountNumber ??
          shareholder.shareholderAccountNumber ??
          null,
        shares:
          shareholder.shares ??
          shareholder.shareholderShares ??
          null,
        ownershipPercentage:
          shareholder.ownershipPercentage ??
          shareholder.percentage ??
          null,
      },
      kyc: {
        createdAt: kyc.createdAt ?? null,
        updatedAt: kyc.updatedAt ?? null,
        status: kyc.status ?? null,
        kycStatus: kyc.kycStatus ?? null,
        verificationStatus: kyc.verificationStatus ?? null,
        kycApproved: kyc.kycApproved ?? null,
      },
    }, null, 2));

    console.log("--------------------------------------------");
  }

  console.log("");
  console.log("READ-ONLY HISTORY CHECK COMPLETE.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
