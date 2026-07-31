const cron = require('node-cron');
const Business = require('../models/Business'); 

const startExpiryCheck = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log("--- Expiry Check Task Started ---");
    try {
      const today = new Date();

      const result = await Business.updateMany(
        {
          "subscription.expiryDate": { $lt: today },
          status: { $in: ["Active"] } 
        },
        {
          $pull: { status: "Active" },    
          $addToSet: { status: "Expired" } 
        }
      );

      console.log(`Update Complete: ${result.modifiedCount} shops marked as Expired.`);
      console.log("--- Expiry Check Task Finished ---");
    } catch (error) {
      console.error("Cron Job Error:", error);
    }
  });
};

module.exports = startExpiryCheck;