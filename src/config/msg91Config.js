require("dotenv").config();

const msg91Config = {
  authKey: process.env.MSG91_AUTH_KEY,
  templateId: process.env.MSG91_TEMPLATE_ID,

validateConfig() {
    if (!this.authKey) {
      throw new Error(" MSG91_AUTH_KEY is missing in .env");
    }

    if (!this.templateId) {
      throw new Error(" MSG91_TEMPLATE_ID is missing in .env");
    }
  },
};

msg91Config.validateConfig();

module.exports = msg91Config;