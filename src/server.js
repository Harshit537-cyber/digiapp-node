require("dotenv").config();

const dns = require("node:dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);
require("../src/jobs/notificationCron");

const app = require("./app");
const http = require("http"); 
const { Server } = require("socket.io"); 
const chatSocket = require("./socket/chatSocket")


require('./jobs/sosCron'); 
const Message = require("./models/message.model");

const PORT = process.env.PORT ||5000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});
chatSocket(io);


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
