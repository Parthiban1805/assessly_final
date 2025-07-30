const mongoose = require('mongoose');
const { Schema } = mongoose;

const notificationSchema = new Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    semester: { type: String },
    year: { type: Number },
    department: { type: String },
    openDate: { type: String, required: true },
    openTime: { type: String, required: true },
    closeDate: { type: String, required: true },
    closeTime: { type: String, required: true },
    openDateTime: { type: Date },
    closeDateTime: { type: Date },
}, { timestamps: true });

notificationSchema.pre('save', function(next) {
    if (this.openDate && this.openTime) {
        const [hours, minutes] = this.openTime.split(':');
        const openDateTime = new Date(this.openDate);
        openDateTime.setHours(hours, minutes, 0, 0);
        this.openDateTime = openDateTime;
    }
    if (this.closeDate && this.closeTime) {
        const [hours, minutes] = this.closeTime.split(':');
        const closeDateTime = new Date(this.closeDate);
        closeDateTime.setHours(hours, minutes, 0, 0);
        this.closeDateTime = closeDateTime;
    }
    next();
});

const ImportantNotification = mongoose.model('ImportantNotification', notificationSchema);

module.exports = ImportantNotification;