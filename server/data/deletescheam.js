const mongoose = require('mongoose');
const Student = require('../models/Student');

// Connect to your MongoDB
mongoose.connect('mongodb+srv://parthis1805:Parthiban1805@cluster0.scfit.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Failed to connect to MongoDB', err));

// Delete all documents in the Student collection
const deleteAllStudents = async () => {
  try {
    const result = await Student.deleteMany({});
    console.log(`${result.deletedCount} documents deleted.`);
  } catch (error) {
    console.error('Error deleting documents:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Call the function
deleteAllStudents();
