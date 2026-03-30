const admin = require("firebase-admin");
const path = require("path");

// Load the service account file
const serviceAccount = require(path.resolve(__dirname, "../../src/service-account.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const messaging = admin.messaging();

module.exports = messaging;