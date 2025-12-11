import mongoose from "mongoose";
import cors from "cors";
import express from "express";
import UserModel from "./Models/UserModel.js";
import bcrypt from "bcrypt";

import EventModel from "./Models/EventModel.js";
import PostModel from "./Models/Posts.js";

import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

import * as ENV from "./config.js";

const app = express();

//Middleware
const corsOptions = {
  origin: ENV.CLIENT_URL, //client URL local
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  credentials: true, // Enable credentials (cookies, authorization headers, etc.)
};
app.use(cors(corsOptions));
app.use(express.json());

//Database connection
const connectString = `mongodb+srv://${ENV.DB_USER}:${ENV.DB_PASSWORD}@${ENV.DB_CLUSTER}/${ENV.DB_NAME}?appName=EventCluster`;
mongoose
  .connect(connectString)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("Connection Error:", err));

// Convert the URL of the current module to a file path
const __filename = fileURLToPath(import.meta.url);
// Get the directory name from the current file path
const __dirname = dirname(__filename);
// Set up middleware to serve static files from the 'uploads' directory
// Requests to '/uploads' will serve files from the local 'uploads' folder
app.use("/uploads", express.static(__dirname + "/uploads"));

// Set up multer for file storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // Specify the directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // Unique filename
  },
});
// Create multer instance
const upload = multer({ storage: storage });

app.post("/registerUser", async (req, res) => {
  try {
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = new UserModel({
      username: username,
      email: email,
      password: hashedpassword,
    });
    await user.save();
    res.send({ user: user, msg: "Added." });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: "Email and password are required." });
    }

    const user = await UserModel.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Incorrect password" });
    }

    res.status(200).json({ user, message: "Login successful." });
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/logout", async (req, res) => {
  res.status(200).json({ message: "Logged out successfully" });
});

app.post("/addEvent", async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      locationName,

      isPublic,
    } = req.body;

    const event = new EventModel({
      title,
      description,
      date,
      time,
      locationName,

      isPublic,
    });

    await event.save();

    res.send({ event: event, msg: "Event Added." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "An error occurred while adding the event" });
  }
});

app.get("/events", async (req, res) => {
  try {
    const eventList = await EventModel.find();
    res.json(eventList);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get("/events/:id", async (req, res) => {
  try {
    const event = await EventModel.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json(event);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch event" });
  }
});

app.delete("/deleteEvent/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const deleted = await EventModel.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server error" });
  }
});

//POST API - savePost
app.post("/savePost", async (req, res) => {
  console.log("BODY:", req.body);

  try {
    const postMsg = req.body.postMsg;
    const email = req.body.email;
    const post = new PostModel({
      postMsg: postMsg,
      email: email,
    });
    await post.save();
    res.send({ post: post, msg: "Added." });
  } catch (error) {
    res.status(500).json({ error: "An error occurred" });
  }
});

//GET API - getPost
app.get("/getPosts", async (req, res) => {
  try {
    // Fetch all posts from the "PostModel" collection, sorted by createdAt in descending order
    const posts = await PostModel.find({}).sort({ createdAt: -1 });
    const countPost = await PostModel.countDocuments({});
    res.send({ posts: posts, count: countPost });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.put("/likePost/:postId/", async (req, res) => {
  const postId = req.params.postId;
  const userId = req.body.userId;
  try {
    //search the postId if it exists
    const postToUpdate = await PostModel.findOne({ _id: postId });
    if (!postToUpdate) {
      return res.status(404).json({ msg: "Post not found." });
    }
    //Search the user Id from the array of users who liked the post.
    const userIndex = postToUpdate.likes.users.indexOf(userId);
    //indexOf method returns the index of the first occurrence of a specified value in an array.
    //If the value is not found, it returns -1.
    //This code will toogle from like to unlike
    if (userIndex !== -1) {
      // User has already liked the post, so unlike it
      const udpatedPost = await PostModel.findOneAndUpdate(
        { _id: postId },
        {
          $inc: { "likes.count": -1 }, // Decrement the like count $inc and $pull are update operators
          $pull: { "likes.users": userId }, // Remove userId from the users array
        },
        { new: true } // Return the modified document
      );
      res.json({ post: udpatedPost, msg: "Post unliked." });
    } else {
      // User hasn't liked the post, so like it
      const updatedPost = await PostModel.findOneAndUpdate(
        { _id: postId },
        {
          $inc: { "likes.count": 1 }, // Increment the like count
          $addToSet: { "likes.users": userId }, // Add userId to the users array if not already present
        },
        { new: true } // Return the modified document
      );
      res.json({ post: updatedPost, msg: "Post liked." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "An error occurred" });
  }
});

app.put("/updateUserProfile/:email/", async (req, res) => {
  //Retrieve the value from the route
  const email = req.params.email;
  //Retrieve the values from the request body.
  const username = req.body.username;
  const password = req.body.password;
  try {
    // Search for the user that will be updated using the findOne method
    const userToUpdate = await UserModel.findOne({ email: email });
    // Check if the user was found
    if (!userToUpdate) {
      return res.status(404).json({ error: "User not found" });
    }
    // Check if a file was uploaded and get the filename
    let profilePic = null;
    if (req.file) {
      profilePic = req.file.filename; // Filename of uploaded file
      // Update profile picture if a new one was uploaded but delete first the old image
      if (userToUpdate.profilePic) {
        const oldFilePath = path.join(
          __dirname,
          "uploads",
          userToUpdate.profilePic
        );
        fs.unlink(oldFilePath, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          } else {
            console.log("Old file deleted successfully");
          }
        });
        userToUpdate.profilePic = profilePic; // Set new profile picture path
      }
    } else {
      console.log("No file uploaded");
    }
    // Update the user's name
    userToUpdate.username = username;
    //if the user changed the password, change the password in the Db to the new hashed password
    if (password !== userToUpdate.password) {
      const hashedpassword = await bcrypt.hash(password, 10);
      userToUpdate.password = hashedpassword;
    } else {
      //if the user did not change the password
      userToUpdate.password = password;
    }
    // Save the updated user
    await userToUpdate.save(); // Make sure to save the changes
    // Return the updated user as a response
    res.send({ user: userToUpdate, msg: "Updated." });
  } catch (err) {
    res.status(500).json({ error: err });
    return;
  }
});

app.listen(3001, () => {
  console.log("You are connected");
});
