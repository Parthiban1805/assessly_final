const multer = require('multer');

// Use memory storage for all uploads so we can process buffers
const storage = multer.memoryStorage();

// --- Specialized File Filters ---

// Filter for document uploads (e.g., study materials)
const documentFileFilter = (req, file, cb) => {
    const allowedTypes = [
        'application/pdf', 
        'text/csv', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, CSV, and XLSX are allowed.'), false);
    }
};

// Filter for image uploads (e.g., face verification)
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only images (JPEG, PNG) are allowed.'), false);
    }
};

// Filter for audio uploads (e.g., voice enrollment)
const audioFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only audio files are allowed.'), false);
    }
};

// Filter for video uploads
const videoFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only video files are allowed.'), false);
    }
};


// --- Multer Instances ---

// This middleware handles both image and audio upload in one request
const uploadCheckFiles = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Max 10MB total
}).fields([
    { name: 'livePhotos', maxCount: 15 }, // Allow up to 15 photos for verification
    { name: 'audioChunk', maxCount: 1 }
]);

// Use this for study materials or question CSVs
const uploadDocument = multer({
    storage: storage,
    fileFilter: documentFileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Use this for face snapshots
const uploadImage = multer({
    storage: storage,
    fileFilter: imageFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Use this for voice samples
const uploadAudio = multer({
    storage: storage,
    fileFilter: audioFileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB limit
});

// Export a specialized multer instance for video
const uploadVideo = multer({
    storage: storage,
    fileFilter: videoFileFilter,
    limits: { fileSize: 20 * 1024 * 1024 } // 20 MB limit for video clips
});


// --- EXPORT ALL MIDDLEWARE ---
// By consolidating all exports into a single object at the end,
// you prevent accidental overwrites.
module.exports = {
    uploadCheckFiles,
    uploadDocument,
    uploadImage,
    uploadAudio,
    uploadVideo
};