import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  resolve: { alias: { "@faircart/shared": path.resolve(__dirname, "repo/packages/shared/src/payment/index.ts") } },
  test: {
    include: ["repo/apps/api/tests/**/*.test.ts"],
    env: {
      PAYPAL_CLIENT_ID: "test-id", PAYPAL_CLIENT_SECRET: "test-secret",
      PAYPAL_BASE_URL: "https://api-m.sandbox.paypal.com", PAYPAL_WEBHOOK_ID: "WH-TEST",
      FRONTEND_URL: "http://localhost:4000",
    },
  },
});
