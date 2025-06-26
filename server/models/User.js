const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  username:  { type: String, required: true, minlength: 3 },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true, minlength: 6 },
  avatar:    { type: String, default: "" },
  verified:  { type: Boolean, default: false },
  friends:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("User", UserSchema);
