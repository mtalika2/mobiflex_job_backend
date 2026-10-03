$path = 'C:\src\mobiflex_african\airtel_backend\server.ts'
$text = [System.IO.File]::ReadAllText($path)

if ($text -match '/admin/manager-payroll/:payrollId/payout/preflight') {
    Write-Host 'PREFLIGHT ROUTE ALREADY EXISTS'
    exit 0
}

$marker = 'app.post("/admin/manager-payroll/:payrollId/payout",'

if (-not $text.Contains($marker)) {
    throw 'REAL PAYOUT ROUTE MARKER NOT FOUND. No changes made.'
}

$insert = @'
app.get(
  "/admin/manager-payroll/:payrollId/payout/preflight",
  async (req: Request, res: Response) => {
    try {
      await verifySuperAdmin(req);

      const payrollId = text(req.params.payrollId);

      if (!payrollId) {
        return res.status(400).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error: "Payroll ID is required.",
        });
      }

      const payrollSnap = await db
        .collection("manager_payroll")
        .doc(payrollId)
        .get();

      if (!payrollSnap.exists) {
        return res.status(404).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error: "Payroll record not found.",
        });
      }

      const payroll = payrollSnap.data() ?? {};
      const payrollStatus = text(payroll.status).toLowerCase();

      if (
        payrollStatus !== "approved" ||
        payroll.approvedForPayment !== true
      ) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error: "Payroll is not approved and ready for payment.",
          payrollStatus: payroll.status ?? null,
          approvedForPayment:
            payroll.approvedForPayment === true,
        });
      }

      const managerUid = text(
        payroll.managerUid ??
          payroll.managerUID ??
          payroll.uid,
      );

      if (!managerUid) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error: "Manager UID is missing from payroll.",
        });
      }

      const managerSnap = await db
        .collection("users")
        .doc(managerUid)
        .get();

      if (!managerSnap.exists) {
        return res.status(404).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error: "Manager account was not found.",
        });
      }

      const managerData = managerSnap.data() ?? {};

      const payoutAccountSnap = await db
        .collection("manager_payout_accounts")
        .doc(managerUid)
        .get();

      if (!payoutAccountSnap.exists) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            "Manager payout account is not configured.",
        });
      }

      const payoutAccount =
        payoutAccountSnap.data() ?? {};

      const payoutAccountStatus =
        text(payoutAccount.status).toUpperCase();

      if (payoutAccountStatus !== "VERIFIED") {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            "Manager payout account must be VERIFIED before payout.",
          payoutAccountStatus:
            payoutAccount.status ?? "PENDING",
        });
      }

      const currency = normalizeCurrency(
        payroll.currency ??
          managerData.currency ??
          payoutAccount.currency ??
          "MWK",
      );

      const amount = payrollPayoutAmount(payroll);

      if (amount <= 0) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            "Payroll payable amount must be greater than zero.",
        });
      }

      if (currency !== "MWK") {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            "Live payroll payout is currently enabled only for MWK in this MobiFlex PayChangu integration.",
          currency,
        });
      }

      assertPayChanguConfigured();

      const walletBalance =
        await getPayChanguWalletBalance(currency);

      if (
        walletBalance.environment &&
        walletBalance.environment.toLowerCase() !== "live"
      ) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            PayChangu wallet is not in live environment. Current environment: .,
          environment:
            walletBalance.environment,
        });
      }

      if (
        walletBalance.currency &&
        walletBalance.currency !== currency
      ) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            PayChangu wallet currency mismatch. Expected , received .,
          walletCurrency:
            walletBalance.currency,
          currency,
        });
      }

      if (
        walletBalance.mainBalance + 0.0001 <
        amount
      ) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            Insufficient PayChangu main balance for payroll payout. Required:  ; available:  .,
          requiredAmount: amount,
          availableBalance:
            walletBalance.mainBalance,
          currency,
        });
      }

      const payoutMethod =
        text(payoutAccount.method).toLowerCase();

      if (!payoutMethod) {
        return res.status(409).json({
          success: false,
          ready: false,
          payoutWillSubmit: false,
          error:
            "Payout method is required: mobile_money or bank_transfer.",
        });
      }

      if (
        payoutMethod === "mobile_money" ||
        payoutMethod === "mobilemoney" ||
        payoutMethod === "momo"
      ) {
        const operator = normalizeOperator(
          payoutAccount.operator ??
            payoutAccount.providerName,
        );

        if (!operator) {
          return res.status(409).json({
            success: false,
            ready: false,
            payoutWillSubmit: false,
            error:
              "Airtel or TNM operator is required for mobile-money payout.",
          });
        }

        await resolvePayChanguOperator(operator);

        const mobile = cleanMalawiMobile(
          payoutAccount.phoneNumber ??
            payoutAccount.phone,
        );

        if (!/^\\+265[89][0-9]{7,8}$/.test(mobile)) {
          return res.status(409).json({
            success: false,
            ready: false,
            payoutWillSubmit: false,
            error:
              "A valid Malawi mobile-money number is required.",
          });
        }

        return res.status(200).json({
          success: true,
          ready: true,
          payoutWillSubmit: false,
          payrollId,
          managerUid,
          currency,
          amount,
          payoutMethod: "mobile_money",
          operator,
          mobile,
          payoutAccountStatus,
          walletEnvironment:
            walletBalance.environment ?? null,
          walletCurrency:
            walletBalance.currency ?? currency,
          availableBalance:
            walletBalance.mainBalance,
          message:
            "Payroll payout preflight passed. No payout was submitted.",
        });
      }

      if (
        payoutMethod === "bank" ||
        payoutMethod === "bank_transfer" ||
        payoutMethod === "banktransfer"
      ) {
        const bankUuid = text(
          payoutAccount.bankUuid ??
            payoutAccount.bank_uuid,
        );

        const accountName = text(
          payoutAccount.accountName ??
            managerData.name ??
            managerData.fullName,
        );

        const accountNumber = text(
          payoutAccount.accountNumber,
        );

        if (!bankUuid) {
          return res.status(409).json({
            success: false,
            ready: false,
            payoutWillSubmit: false,
            error:
              "Bank UUID is required for bank payout.",
          });
        }

        if (!accountName) {
          return res.status(409).json({
            success: false,
            ready: false,
            payoutWillSubmit: false,
            error:
              "Bank account name is required.",
          });
        }

        if (!accountNumber) {
          return res.status(409).json({
            success: false,
            ready: false,
            payoutWillSubmit: false,
            error:
              "Bank account number is required.",
          });
        }

        return res.status(200).json({
          success: true,
          ready: true,
          payoutWillSubmit: false,
          payrollId,
          managerUid,
          currency,
          amount,
          payoutMethod: "bank_transfer",
          bankUuid,
          accountName,
          payoutAccountStatus,
          walletEnvironment:
            walletBalance.environment ?? null,
          walletCurrency:
            walletBalance.currency ?? currency,
          availableBalance:
            walletBalance.mainBalance,
          message:
            "Payroll payout preflight passed. No payout was submitted.",
        });
      }

      return res.status(409).json({
        success: false,
        ready: false,
        payoutWillSubmit: false,
        error:
          "Unsupported payout method. Use mobile_money or bank_transfer.",
        payoutMethod,
      });
    } catch (error) {
      console.error(
        "Manager payroll payout preflight error:",
        error,
      );

      return res.status(500).json({
        success: false,
        ready: false,
        payoutWillSubmit: false,
        error:
          error instanceof Error
            ? error.message
            : "Payroll payout preflight failed.",
      });
    }
  },

'@

$text = $text.Replace($marker, $insert + $marker)

[System.IO.File]::WriteAllText(
    $path,
    $text,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host 'PREFLIGHT ROUTE ADDED'
Write-Host ('server.ts size: ' + ([System.IO.File]::ReadAllBytes($path).Length))

