require("dotenv").config();
const app = require("./app");
const http = require("http");
const {Server} = require("socket.io");
const Message = require("./models/message.model");

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "", 
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on("join_room", (data) => {
    const { sender, receiver } = data;
    const roomID = [sender, receiver].sort().join("_");
    socket.join(roomID);
    console.log(`User joined room: ${roomID}`);
  });

  socket.on("send_message", async (data) => {
    const { sender, receiver, text } = data;
    const roomID = [sender, receiver].sort().join("_");

    try {
      const newMessage = new Message({
        room: roomID,
        sender,
        receiver,
        text,
      });
      await newMessage.save();
      io.to(roomID).emit("receive_message", newMessage);
    } catch (err) {
      console.error("Message Save Error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});


server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
