import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { midtransSignature, verifyMidtransNotification } from "@/server/midtrans";
import { nicepayMerchantToken, verifyNicepayCallback } from "@/server/nicepay";
import { verifyXenditCallback } from "@/server/xendit";

assert.equal(
  verifyXenditCallback("secret-token", { apiSecret: "x", webhookToken: "secret-token" }),
  true,
);
assert.equal(
  verifyXenditCallback("wrong", { apiSecret: "x", webhookToken: "secret-token" }),
  false,
);

const orderId = "order-1";
const statusCode = "200";
const grossAmount = "10000.00";
const serverKey = "SB-Mid-server-xxx";
const sig = midtransSignature(orderId, statusCode, grossAmount, serverKey);
assert.equal(
  verifyMidtransNotification(
    {
      order_id: orderId,
      status_code: statusCode,
      gross_amount: grossAmount,
      signature_key: sig,
      transaction_status: "settlement",
    },
    { serverKey, clientKey: "", environment: "sandbox" },
  ),
  true,
);
assert.equal(
  createHash("sha512").update(`${orderId}${statusCode}${grossAmount}${serverKey}`).digest("hex"),
  sig,
);

const ts = "20221202101271";
const iMid = "IONPAYTEST";
const refNo = "OrdNo-1";
const amt = "100000";
const merchantKey = "test-key";
const token = nicepayMerchantToken(ts, iMid, refNo, amt, merchantKey);
assert.equal(
  verifyNicepayCallback(
    { timeStamp: ts, iMid, referenceNo: refNo, amt, merchantToken: token },
    { merchantId: iMid, merchantKey },
  ),
  true,
);
assert.equal(
  verifyNicepayCallback(
    { timeStamp: ts, iMid, referenceNo: refNo, amt, merchantToken: "deadbeef" },
    { merchantId: iMid, merchantKey },
  ),
  false,
);

console.log("xendit/midtrans/nicepay verify ok");
