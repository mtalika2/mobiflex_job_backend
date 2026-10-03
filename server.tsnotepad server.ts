import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";

import {
  getApps,
  initializeApp,
  cert,
} from "firebase-admin/app";

import {
  getFirestore,
  FieldValue,
} from "firebase-admin/firestore";

dotenv.config();

// ============================================================
// APP
// ============================================================

const app = express();

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(
  express.json({
    limit: "5mb",
  }),
);

// ============================================================
// FIREBASE ADMIN
// ============================================================

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  "mobiflex-african";

const FIREBASE_CLIENT_EMAIL =
  process.env.FIREBASE_CLIENT_EMAIL ||
  "";

const FIREBASE_PRIVATE_KEY =
  process.env.FIREBASE_PRIVATE_KEY
    ?.replace(/\\n/g, "\n") || "";

if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = getFirestore();

// ============================================================
// CONFIGURATION
// ============================================================

const PORT = Number(
  process.env.PORT || 3000,
);

// ============================================================
// HEALTH CHECK
// ============================================================

app.get(
  "/",
  (
    _req: Request,
    res: Response,
  ) => {
    return res.json({
      success: true,
      service:
        "MobiFlex African Airtel Backend",
      firebaseProject:
        PROJECT_ID,
    });
  },
);

// ============================================================
// AIRTEL PAYMENT REQUEST
// ============================================================

app.post(
  "/airtel/payment-request",
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const {
        applicationId,
        phone,
        amount,
      } = req.body;

      // --------------------------------------------------------
      // VALIDATE APPLICATION ID
      // --------------------------------------------------------

      if (!applicationId) {
        return res.status(400).json({
          success: false,
          message:
            "Application ID is required.",
        });
      }

      // --------------------------------------------------------
      // VALIDATE PHONE
      // --------------------------------------------------------

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Phone number is required.",
        });
      }

      // --------------------------------------------------------
      // VALIDATE AMOUNT
      // --------------------------------------------------------

      const paymentAmount =
        Number(amount);

      if (
        !Number.isFinite(
          paymentAmount,
        ) ||
        paymentAmount <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment amount.",
        });
      }

      // --------------------------------------------------------
      // GET APPLICATION
      // --------------------------------------------------------

      const applicationRef =
        db
          .collection("applications")
          .doc(applicationId);

      const applicationSnap =
        await applicationRef.get();

      if (!applicationSnap.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Application not found.",
        });
      }

      const application =
        applicationSnap.data() ?? {};

      // --------------------------------------------------------
      // REMAINING BALANCE
      // --------------------------------------------------------

      const remaining =
        Number(
          application.remainingAmount ?? 0,
        );

      if (remaining <= 0) {
        return res.status(400).json({
          success: false,
          message:
            "Application is already fully paid.",
        });
      }

      // --------------------------------------------------------
      // PAYMENT CANNOT EXCEED BALANCE
      // --------------------------------------------------------

      if (
        paymentAmount >
        remaining
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment cannot be greater than remaining amount.",
        });
      }

      // --------------------------------------------------------
      // CREATE PAYMENT REQUEST
      // --------------------------------------------------------

      const paymentRef =
        db
          .collection(
            "payment_requests",
          )
          .doc();

      await paymentRef.set({
        applicationId,

        customerId:
          application.customerId ??
          null,

        customerName:
          application.customerName ??
          "",

        customerPhone:
          application.customerPhone ??
          phone,

        phone,

        amount:
          paymentAmount,

        provider:
          "airtel_money",

        status:
          "Pending",

        backend:
          "local_node",

        createdAt:
          FieldValue.serverTimestamp(),

        updatedAt:
          FieldValue.serverTimestamp(),
      });

      // --------------------------------------------------------
      // RESPONSE
      // --------------------------------------------------------

      return res.json({
        success: true,

        paymentId:
          paymentRef.id,

        status:
          "Pending",

        message:
          "Airtel payment request created.",
      });
    } catch (error) {
      console.error(
        "Airtel payment request error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error.",
      });
    }
  },
);

// ============================================================
// START LOCAL SERVER
// ============================================================

if (require.main === module) {
  app.listen(
    PORT,
    () => {
      console.log("");
      console.log(
        "==============================================",
      );
      console.log(
        " MobiFlex African Airtel Backend",
      );
      console.log(
        "==============================================",
      );
      console.log(
        ` Server: http://localhost:${PORT}`,
      );
      console.log(
        ` Firebase: ${PROJECT_ID}`,
      );
      console.log(
        " Airtel Payment Request: ENABLED",
      );
      console.log(
        "==============================================",
      );
      console.log("");
    },
  );
}

// ============================================================
// EXPORT EXPRESS APP
// ============================================================

export { app };