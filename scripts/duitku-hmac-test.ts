import assert from "node:assert/strict";
import { duitkuHmac, verifyDuitkuCallback } from "@/server/duitku";

const apiKey = "test-api-key";
const merchantCode = "D20529";
const amount = "150000";
const merchantOrderId = "INV-1";
const signature = duitkuHmac(`${merchantCode}${amount}${merchantOrderId}`, apiKey);

assert.equal(
  verifyDuitkuCallback(
    {
      merchantCode,
      amount,
      merchantOrderId,
      productDetail: "",
      additionalParam: "",
      paymentCode: "SP",
      resultCode: "00",
      merchantUserId: "",
      reference: "REF",
      signature,
    },
    { merchantCode, apiKey, environment: "sandbox" },
  ),
  true,
  "HMAC resmi Duitku harus cocok",
);

assert.equal(
  verifyDuitkuCallback(
    {
      merchantCode,
      amount,
      merchantOrderId,
      productDetail: "",
      additionalParam: "",
      paymentCode: "SP",
      resultCode: "00",
      merchantUserId: "",
      reference: "REF",
      signature: "deadbeef",
    },
    { merchantCode, apiKey, environment: "sandbox" },
  ),
  false,
  "signature salah harus ditolak",
);

console.log("duitku hmac ok");
