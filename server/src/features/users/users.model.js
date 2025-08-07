const mongoose = require('mongoose');

// Your existing Student Schema definition...
const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  student_id: { type: String, required: true, unique: true },
  semester: { type: String, required: true }, 
  year: { type: String, required: true },     
  boarding: { type: String, required: true },
  class_advisor: { type: String, required: true },
  department: { type: String, required: true },
  photo_url: { type: String },
     face_embedding: {
        type: [Number],
        default: [] // Default to an empty array
    },
  phone: { type: String }, // Added phone field
  role: { type: String },           
});
const Student = mongoose.model('Student', StudentSchema);

// Your existing Teacher Schema definition...
const TeacherSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    teacher_id: { type: String, required: true, unique: true },
    department: { type: String, required: true },
    subjects: { type: String, required: true },
    photo_url: { type: String },     
    role:{type:String},           
  });
  
const Teacher = mongoose.model('Teacher', TeacherSchema);

// Your existing Admin Schema definition...
const AdminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:{type:String, required:true}
});
const Admin = mongoose.model('Admin', AdminSchema);



// Export all models from one place
module.exports = { Student, Teacher, Admin };