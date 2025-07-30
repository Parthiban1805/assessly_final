const mongoose = require('mongoose');
const fs = require('fs');
const { Assessment } = require('../src/features/assessments/assessments.model'); // Update the path accordingly
const { Subject } = require('../src/features/subjects/subjects.model'); // Update the path accordingly

// MongoDB connection
mongoose.connect('mongodb+srv://weacttech:Parthiban1805@cluster0.xfnianb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch((err) => console.error(err));

// Insert Subjects and Assessments
const insertData = async () => {
  const subjectsData = JSON.parse(fs.readFileSync('./club.json', 'utf-8'));
  const assessmentsData = JSON.parse(fs.readFileSync('./club_ass.json', 'utf-8'));

  // Create assessments and store them in MongoDB
  const createdAssessments = {};
  for (const assessment of assessmentsData) {
    const createdAssessment = await Assessment.create({
      name: assessment.asses_name,
      subjectName: assessment.subject_name,
      department: assessment.department,
      year: assessment.year,
      openDate : assessment.openDate,
      closeDate : assessment.closeDate,
      openTime: assessment.openTime,
      closeTime: assessment.closeTime,
      status: assessment.status,
      marks: assessment.marks,
      question: assessment.question || "Default Question", // Provide a default or check data
      questionperstudent: assessment.questionperstudent || 1, // Provide a valid default
      file: assessment.file || "default_file.pdf", // Ensure a file is provided
      teacher_id: assessment.teacher_id || "default_teacher_id" // Ensure teacher ID exists
    });
    
    if (!createdAssessments[assessment.subject_name]) {
      createdAssessments[assessment.subject_name] = {};
    }
    if (!createdAssessments[assessment.subject_name][assessment.year]) {
      createdAssessments[assessment.subject_name][assessment.year] = [];
    }
    createdAssessments[assessment.subject_name][assessment.year].push(createdAssessment._id);
  }

  // Create subjects and update assessments array based on matching criteria
  for (const subject of subjectsData) {
    const subjectAssessments =
      createdAssessments[subject.sub_name] && createdAssessments[subject.sub_name][subject.year]
        ? createdAssessments[subject.sub_name][subject.year]
        : [];
    await Subject.create({
      name: subject.sub_name,
      year: subject.year,
      department: subject.department,
      description: subject.description,
      staff: subject.staff,
      assessments: subjectAssessments, // Add matching assessment IDs
    });
  }

  console.log('Subjects and assessments inserted successfully');
};

// Main Function
const main = async () => {
  await insertData();
  mongoose.connection.close();
};

main();
