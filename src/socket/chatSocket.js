const Message = require("../models/message.model");
const mongoose = require("mongoose"); 

const chatSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`User Connected: ${socket.id}`);

    socket.on("join_room", (data) => {
      const { senderId, receiverId, referenceId } = data;
      
      const sortedIds = [senderId, receiverId].sort();
      const roomID = `${sortedIds[0]}_${sortedIds[1]}_${referenceId}`;
      
      socket.join(roomID);
      console.log(`User joined room: ${roomID}`);
    });

    socket.on("send_message", async (data) => {
      const { senderId, receiverId, text, referenceId, moduleType } = data;
      
      const sortedIds = [senderId, receiverId].sort();
      const roomID = `${sortedIds[0]}_${sortedIds[1]}_${referenceId}`;

      try {
        const newMessage = new Message({
          roomID,
          sender: new mongoose.Types.ObjectId(senderId), 
          receiver: new mongoose.Types.ObjectId(receiverId),
          text,
          referenceId: new mongoose.Types.ObjectId(referenceId),
          moduleType,
        });

        await newMessage.save();

        io.to(roomID).emit("receive_message", newMessage);
      } catch (err) {
        console.error("Socket Error:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("User Disconnected", socket.id);
    });
  });
};

module.exports = chatSocket;



// const Message = require("../models/message.model");
// 

