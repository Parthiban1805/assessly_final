const mongoose = require('mongoose');
const csv = require('csv-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');

mongoose.connect(
  'mongodb+srv://weacttech:Parthiban1805@cluster0.xfnianb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
);

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  teacher_id: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  subjects: { type: String, required: true },
  photo_url: { type: String },
  role: { type: String },
});

const Teacher = mongoose.model('Teacher', teacherSchema);

// Function to import teachers from CSV
const importTeachers = async () => {
  const teachers = [];
  const promises = []; // Store async password hash operations

  fs.createReadStream("teachers_with_roles_and_photos.csv")
    .pipe(csv())
    .on('data', (row) => {
      if (!row.name || !row.email || !row.password) {
        console.error("Skipping row due to missing data:", row);
        return;
      }

      // Hash password asynchronously and store in teachers array after completion
      const hashedPasswordPromise = bcrypt.hash(row.password, 10).then((hashedPassword) => {
        teachers.push({
          name: row.name,
          email: row.email,
          teacher_id: row.teacher_id,
          department: row.department,
          subjects: row.subjects,
          photo_url: row.photo_url,
          role: row.role || "teacher", // Ensure a default role
          password: hashedPassword,
        });
      });

      promises.push(hashedPasswordPromise); // Add hashing promise to the list
    })
    .on('end', async () => {
      await Promise.all(promises); // Wait for all hashing operations to finish

      console.log(`Importing ${teachers.length} teachers into the database...`);

      for (const teacher of teachers) {
        try {
          await Teacher.updateOne(
            { email: teacher.email },
            { $set: teacher },
            { upsert: true }
          );
          console.log(`Imported: ${teacher.email}`);
        } catch (error) {
          console.error(`Failed to import: ${teacher.email}`, error.message);
        }
      }

      console.log('Import process completed.');
      mongoose.connection.close();
    });
};

// Call the import function
importTeachers();
