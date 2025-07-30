const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
require('dotenv').config();
console.log("Admin Password:", process.env.ADMIN_PASSWORD); // Debugging

// Import the Admin and Worker models
const {Admin }= require('../src/features/users/users.model'); // Path to your Admin model

// Load environment variables from .env file
dotenv.config();

async function seedDatabase() {
  try {
    // Connect to MongoDB (replace this with your actual connection string)
    await mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.xfnianb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Password hashing
    const saltRounds = 10;
    const adminHashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, saltRounds);

    // Insert the admin details into the database
    const admin = new Admin({
      email: process.env.ADMIN_EMAIL,
      password: adminHashedPassword,
      role:"admin",
    });

    // Insert the worker details into the database
    

    

    // Save the users to the database
    await admin.save();

    console.log('Admin and workers saved successfully!');
  } catch (err) {
    console.error('Error seeding database:', err);
  } finally {
    // Disconnect from the database after seeding
    mongoose.disconnect();
  }
}

seedDatabase();
