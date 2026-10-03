require("dotenv/config");

const { applicationDefault, getApps, initializeApp } =
  require("firebase-admin/app");

const { getFirestore } =
  require("firebase-admin/firestore");

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || "mobiflex-african";

if (getApps().length === 0) {
  initializeApp({
    credential: applicationDefault(),
    projectId: PROJECT_ID,
  });
}

const db = getFirestore();

async function main() {
  const snap = await db
    .collection("customers")
    .limit(10)
    .get();

  if (snap.empty) {
    console.log("NO CUSTOMERS FOUND");
    return;
  }

  console.log(`FOUND ${snap.size} CUSTOMER RECORD(S)`);

  for (const doc of snap.docs) {
    const d = doc.data();

    console.log({
      id: doc.id,
      uid: d.uid ?? "",
      name: d.name ?? d.fullName ?? d.customerName ?? "",
      phone: d.phone ?? d.customerPhone ?? "",
      country: d.country ?? "",
      status: d.status ?? d.accountStatus ?? "",
    });
  }
}

main()
  .catch((error) => {
    console.error("ERROR:", error);
    process.exitCode = 1;
  });
