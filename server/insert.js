const mongoose = require('mongoose');
require('dotenv').config();

async function createUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const newUser = new User({
      email: 'parthi.s@gmail.com',
      password: 'password123',
    });

    await newUser.save(); 
    console.log('User created and saved to the database.');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  } finally {
    mongoose.connection.close();
  }
}

createUser();
