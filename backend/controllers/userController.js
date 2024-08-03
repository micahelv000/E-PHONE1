const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

exports.register = async (req, res) => {
  const { username, password, firstName, lastName, city, phoneNumber, isAdmin } = req.body;
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = new User({
    username,
    password: hashedPassword,
    firstName,
    lastName,
    city,
    phoneNumber,
    isAdmin,
    tokenVersion: uuidv4()
  });

  user.save()
      .then((user) => {
        const token = jwt.sign(
            { userId: user._id, isAdmin: user.isAdmin, tokenVersion: user.tokenVersion },
            hashedPassword
        );
        res.status(201).send({ token });
      })
      .catch((err) => res.status(400).send(err));
};

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).send({ message: "Username or password is incorrect" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
      const token = jwt.sign(
          { userId: user._id, isAdmin: user.isAdmin, tokenVersion: user.tokenVersion },
          user.password
      );
      res.status(200).send({ message: "Login successful", token });
    } else {
      res.status(400).send({ message: "Username or password is incorrect" });
    }
  } catch (error) {
    res.status(500).send(error);
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password -__v");
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send("Error fetching user details");
  }
};

exports.updateUser = async (req, res) => {
  const { username, firstName, lastName, city, phoneNumber,isAdmin } = req.body;
  const updateData = { username, firstName, lastName, city, phoneNumber,isAdmin };

  try {
    const options = { new: true };
    const user = await User.findByIdAndUpdate(req.user.userId, updateData, options);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).send(user);
  } catch (error) {
    res.status(500).send("Error updating user details");
  }
};

exports.updatePassword = async (req, res) => {
  const { password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const options = { new: true };
    const user = await User.findByIdAndUpdate(req.user.userId, { password: hashedPassword }, options);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).send("Password updated successfully");
  } catch (error) {
    res.status(500).send("Error updating password");
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password -__v");
    res.status(200).send(users);
  } catch (error) {
    res.status(500).send("Error fetching users");
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).send("User not found");
    }
    res.status(200).send("User deleted successfully");
  } catch (error) {
    res.status(500).send("Error deleting user");
  }
};

exports.syncUsers = async (req, res) => {
  try {
    for (const userData of req.body) {
      const { id, ...updateData } = userData;
      await User.findByIdAndUpdate(id, updateData, { new: true });
    }
    res.status(200).send("Users updated successfully");
  } catch (error) {
    res.status(500).send("Error syncing users");
  }
};

exports.updateUserById = async (req, res) => {
  const { id } = req.params;
  const { username, firstName, lastName, city, phoneNumber, isAdmin } = req.body;
  const updateData = { username, firstName, lastName, city, phoneNumber, isAdmin };

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Check if isAdmin status is changing
    if (user.isAdmin !== isAdmin) {
      updateData.tokenVersion = uuidv4(); // Update tokenVersion to invalidate the token
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, { new: true });
    res.status(200).send(updatedUser);
  } catch (error) {
    res.status(500).send("Error updating user details");
  }
};

exports.forceLogout = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).send("User not found");
    }

    user.tokenVersion = uuidv4(); // Invalidate the token
    await user.save();

    res.status(200).send("User logged out successfully");
  } catch (error) {
    res.status(500).send("Error logging out user");
  }
};