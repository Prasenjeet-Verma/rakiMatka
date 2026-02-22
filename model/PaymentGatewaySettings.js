const mongoose = require("mongoose");

const paymentGatewaySettingsSchema = new mongoose.Schema(
  {
    upiGateway: { type: String, default: "Select" }, // Enable / Disable
    upiGatewayKey: { type: String, default: "" },

    directUpi: { type: String, default: "Select" }, // Enable / Disable
    directGpayId: { type: String, default: "" },
    directPhonepeId: { type: String, default: "" },
    directPaytmId: { type: String, default: "" },

    quickDepositAmounts: { type: String, default: "200,300,500,1000,2500,5000,10000,25000,50000" },
    gatewayWindow: { type: String, default: "Inside App" }, // Inside App / Browser
  },
  { timestamps: true }
);

module.exports = mongoose.model("PaymentGatewaySettings", paymentGatewaySettingsSchema);