const axios = require("axios");
const msg91Config = require("../config/msg91Config");

class OtpService {
  static #client = axios.create({
    baseURL: "https://api.msg91.com/api/v5",
    headers: {
      authkey: msg91Config.authKey,
      "content-type": "application/json",
    },
    timeout: 10000, 
  });


  static async sendOTP(mobile, otp) {
    if (!mobile || !/^\d{10,15}$/.test(mobile)) {
      throw new Error("Invalid mobile format. Include country code without +.");
    }

    const payload = {
      template_id: msg91Config.templateId,
      short_url: "0",
      recipients: [
    {
      mobiles: mobile,
      num: otp.toString(), 
    },
  ],
    };

    try {
      const { data } = await this.#client.post("/flow/", payload);
       console.log("--- MSG91 DEBUG LOG ---");
  console.log("Payload Sent:", JSON.stringify(payload, null, 2));
  console.log("Response Received:", data);
      if (data.type === "error") throw new Error(data.message);
      return { success: true };
    } catch (error) {
      const msg = error.response ? JSON.stringify(error.response.data) : error.message;
      console.error(`[OtpService][Error]: ${msg}`);
      throw new Error("Sms service is currently unavailable.");
    }
  }
}

module.exports = OtpService;