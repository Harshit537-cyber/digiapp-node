const admin = require('../config/firebase-config');
const User = require('../models/User');
const Notification = require('../models/Notification');

exports.sendPushNotification = async (req, res) => {
    const { targetAudience, selection, title, body, scheduleType } = req.body;
    try {
        let message = {
            notification: { title, body },
            data: { click_action: "FLUTTER_NOTIFICATION_CLICK" }
        };
        if (targetAudience === 'Global') {
            message.topic = 'all_users';
            await admin.messaging().send(message);
        }
        else if (targetAudience === 'City-based') {
            const users = await User.find({ location: selection }).select('fcmToken');
            const tokens = users.map(u => u.fcmToken).filter(t => t);

            if (tokens.length > 0) {
                await admin.messaging().sendEachForMulticast({ tokens, notification: { title, body } });
            } else {
                return res.status(404).json({ message: "No users found in this city" });
            }
        }
        else if (targetAudience === 'Category') {
            message.topic = `category_${selection.toLowerCase()}`;
            await admin.messaging().send(message);
        }
        else if (targetAudience === 'Specific User') {
            const user = await User.findById(selection);
            if (user && user.fcmToken) {
                message.token = user.fcmToken;
                await admin.messaging().send(message);
            } else {
                return res.status(404).json({ message: "User or Token not found" });
            }
        }
        const history = new Notification({ title, body, targetAudience, selection });
        await history.save();

        res.status(200).json({ success: true, message: "Notification sent successfully!" });

    } catch (error) {
        console.error("FCM Error:", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getNotificationHistory = async (req, res) => {
    try {
        const history = await Notification.find().sort({ sentAt: -1 }).limit(10);
        res.status(200).json(history);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllUserCities = async (req, res) => {
    try {

        const cities = await User.distinct("city", { 
            city: { $exists: true, $ne: "" } 
        });

        cities.sort();

        res.status(200).json({
            success: true,
            count: cities.length,
            data: cities 
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Cities fetch karne mein error aaya",
            error: error.message
        });
    }
};


const searchUserByName = async (req, res) => {
  try {
    const { name } = req.query; 

    if (!name) {
      return response.error(res, "Please provide a name to search", 400);
    }
    const users = await User.find({
      fullName: { $regex: name, $options: "i" }
    }).select("-token -fcmToken -__v"); 

    return response.success(res, `Found ${users.length} users`, users);
  } catch (err) {
    console.error(err);
    return response.error(res, err.message || "Something went wrong", 500);
  }
}; 