const { google } = require('googleapis');
const stream = require('stream');

// Configure the Google Drive client
const auth = new google.auth.GoogleAuth({
    keyFile: 'path/to/your/apikey.json', // Your service account key file
    scopes: ['https://www.googleapis.com/auth/drive.file'],
});

const drive = google.drive({ version: 'v3', auth });
const DRIVE_FOLDER_ID = '1ACGB_gFcMg4UULRqQ4NJgxaNLOrEjmGT'; // Your target folder ID

/**
 * Uploads a file buffer to Google Drive.
 * @param {Buffer} fileBuffer - The buffer of the file to upload.
 * @param {object} fileMetadata - The original file metadata (name, mimetype).
 * @returns {Promise<string>} The web view link of the uploaded file.
 */
const uploadFileToDrive = async (fileBuffer, fileMetadata) => {
    const bufferStream = new stream.PassThrough();
    bufferStream.end(fileBuffer);

    const response = await drive.files.create({
        requestBody: {
            name: fileMetadata.originalname,
            parents: [DRIVE_FOLDER_ID],
        },
        media: {
            mimeType: fileMetadata.mimetype,
            body: bufferStream,
        },
        fields: 'id,webViewLink',
    });

    if (!response.data.webViewLink) {
        throw new Error('Failed to get public link from Google Drive.');
    }

    return response.data.webViewLink;
};

module.exports = { uploadFileToDrive };