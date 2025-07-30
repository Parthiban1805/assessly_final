const mongoose = require('mongoose');

const DisplayAnswer = new mongoose.Schema({
    settingName: {
        type: String,
        required: true,
        unique: true
    },
    isEnabled: {
        type: Boolean,
        default: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Settings', DisplayAnswer);