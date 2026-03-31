const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.resolve(__dirname, "../../src/service-account.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// EXPORT THE WHOLE admin OBJECT
module.exports = admin;