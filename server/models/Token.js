const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  token:     { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: 43200 } // expire en 12 h
});

module.exports = mongoose.model("Token", TokenSchema);
