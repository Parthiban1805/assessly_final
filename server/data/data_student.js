const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');
const axios = require('axios'); // Import axios

// Import the Student model correctly from your feature structure
// Adjust the path if your script is in a different location
const { Student } = require('../../server1/src/features/users/users.model'); 

const PYTHON_API_URL = 'http://localhost:5001/api';

// --- Connect to MongoDB ---
mongoose.connect(
  'mongodb+srv://weacttech:Parthiban1805@cluster0.1jnvh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
  importStudents(); // Start the import process once connected
});

/**
 * A helper function to call the Python AI service to get the face embedding.
 * @param {string} imageUrl - The public URL of the student's photo.
 * @returns {Promise<Array<number>|null>} The face embedding array, or null if it fails.
 */
const getFaceEmbedding = async (imageUrl) => {
    // First, clean the URL to remove any potential double slashes
    const cleanedUrl = imageUrl.replace(/([^:]\/)\/+/g, "$1");
    try {
        const response = await axios.post(`${PYTHON_API_URL}/generate-embedding`, {
            img_url: cleanedUrl
        });
        return response.data.embedding;
    } catch (error) {
        console.error(`Failed to generate embedding for ${cleanedUrl}:`, error.response?.data?.error || error.message);
        return null; // Return null on failure so the import can continue
    }
};

const importStudents = async () => {
    const studentDataWithEmbeddings = [];
    
    fs.createReadStream("students_with_photos.csv")
      .pipe(csv())
      .on('data', (row) => {
        // We push the row into an array to process them all at once later
        studentDataWithEmbeddings.push(row);
      })
      .on('end', async () => {
        console.log(`Finished reading ${studentDataWithEmbeddings.length} rows from CSV. Now processing...`);

        for (const row of studentDataWithEmbeddings) {
            if (!row.name || !row.email || !row.password || !row.photo_url) {
                console.warn("Skipping row due to missing data:", JSON.stringify(row));
                continue;
            }

            console.log(`Processing student: ${row.email}`);
            
            // 1. Generate Face Embedding by calling our AI service
            const faceEmbedding = await getFaceEmbedding(row.photo_url);
            
            if (!faceEmbedding) {
                console.error(`--> Could not create face embedding for ${row.email}. Skipping this student.`);
                continue; // Skip to the next student if embedding fails
            }
            console.log(`--> Successfully generated embedding for ${row.email}.`);

            // 2. Hash the password
            const hashedPassword = await bcrypt.hash(row.password, 10);
            
            // 3. Prepare the full student document
            const studentDocument = {
                name: row.name,
                email: row.email,
                password: hashedPassword,
                student_id: row.student_id,
                semester: row.semester,
                year: row.year,
                boarding: row.boarding,
                class_advisor: row.class_advisor,
                department: row.department,
                photo_url: row.photo_url,
                role: row.role || 'student',
                phone: row.phone,
                face_embedding: faceEmbedding // <-- Store the embedding here
            };

            // 4. Upsert the student data into MongoDB
            try {
                await Student.updateOne(
                    { email: studentDocument.email },
                    { $set: studentDocument },
                    { upsert: true }
                );
                console.log(`--> Successfully imported/updated: ${studentDocument.email}`);
            } catch (error) {
                console.error(`--> Error saving ${studentDocument.email} to MongoDB:`, error.message);
            }
        }

        console.log("All students processed. Closing database connection.");
        mongoose.connection.close();
      })
      .on('error', (err) => {
        console.error("Fatal CSV Read Error:", err.message);
      });
};