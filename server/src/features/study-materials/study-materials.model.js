const mongoose = require('mongoose');
const { Schema } = mongoose;

const studyMaterialSchema = new Schema({
    teacher_id: { type: String, required: true },
    subjectName: { type: String, required: true },
    year: { type: Number, required: true },
    department: { type: String, required: true },
    filePath: { type: String, required: true }, // This will store the Google Drive link
    fileName: { type: String, required: true }, // Store the original file name
    uploadedAt: { type: Date, default: Date.now },
});

const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);

module.exports = StudyMaterial;