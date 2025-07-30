const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');

// MongoDB connection setup
mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.1jnvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Define the Subject Schema
const subjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  year: {
    type: Number,
    required: true,
    min: 1,
  },
  department: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  staff: {
    type: String,
  },
  totalAssessments: { type: Number, default: 0 },
  club: { type: String }, 

});

const Subject = mongoose.model('Subject', subjectSchema);

// Function to load CSV data and insert into MongoDB
const loadCSVData = async () => {
  const results = [];

  fs.createReadStream('sub.csv')
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const subject of results) {
        const { name, year, department, description, staff } = subject;

        // Convert year to integer and ensure other fields are properly processed
        const yearInt = parseInt(year);
        if (!name || !yearInt || !department) {
          console.log(`Skipping invalid data: ${JSON.stringify(subject)}`);
          continue;
        }

        // Create a new subject document
        const newSubject = new Subject({
          name,
          year: yearInt,
          department: department.toUpperCase(),  // Ensures department is stored in uppercase
          description: description || '',  // Defaults to empty string if no description is provided
          staff: staff || '',  // Defaults to empty string if no staff is provided
        });

        try {
          // Save the subject to the database
          await newSubject.save();
          console.log(`Inserted: ${name}`);
        } catch (err) {
          console.error('Error inserting data:', err);
        }
      }

      // Close the MongoDB connection once the process is complete
      mongoose.connection.close();
      console.log('MongoDB connection closed.');
    });
};

// Run the CSV loading function
loadCSVData();
