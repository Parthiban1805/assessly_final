import axios from 'axios';
import {
    CheckCircle as CheckIcon,
    AlertCircle as AlertIcon,
    Upload as UploadIcon,
    Download
} from 'lucide-react';
import { useState } from 'react';
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AddUser component enables administrators to upload bulk user data (students or teachers)
 * via CSV or XLSX files. It provides sample file downloads and manages the upload process.
 *
 * @returns {JSX.Element} The bulk user upload form.
 */
const AddUser = () => {
    // State to store the selected file's name for display.
    const [fileName, setFileName] = useState('');
    // State to control whether the current upload is for 'student' or 'teacher' accounts.
    const [userType, setUserType] = useState('student'); // Default to 'student'
    // State to manage the submission process, preventing multiple submissions.
    const [isSubmitting, setIsSubmitting] = useState(false);
    // State to hold the actual file object selected by the user.
    const [file, setFile] = useState(null);

    // State for modal visibility and content (success/error messages).
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success' or 'error'
    const [modalMessage, setModalMessage] = useState('');

    /**
     * Closes the modal.
     */
    const closeModal = () => setShowModal(false);

    /**
     * Displays a success modal with a given message.
     * @param {string} msg - The success message to display.
     */
    const showSuccess = (msg) => {
        setModalType('success');
        setModalMessage(msg);
        setShowModal(true);
    };

    /**
     * Displays an error modal with a given message.
     * @param {string} msg - The error message to display.
     */
    const showError = (msg) => {
        setModalType('error');
        setModalMessage(msg);
        setShowModal(true);
    };

    /**
     * Handles file input change, storing the selected file and its name.
     * @param {Event} event - The file input change event.
     */
    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    /**
     * Handles change in user type selection (student/teacher).
     * Resets file input to prevent uploading a file intended for a different user type.
     * @param {Event} event - The radio button change event.
     */
    const handleUserTypeChange = (event) => {
        setUserType(event.target.value);
        // Reset file input when user type changes to avoid confusion.
        setFile(null);
        setFileName('');
        const fileInput = document.getElementById("file-upload");
        if(fileInput) fileInput.value = ''; // Clear the actual file input element.
    };

    /**
     * Handles the form submission for file upload.
     * Validates file presence, sends data to the backend, and displays feedback via modal.
     *
     * @param {Event} event - The form submission event.
     */
    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!file) {
            showError('Please select a file to upload.');
            return;
        }

        setIsSubmitting(true); // Disable submit button during upload.
        const token = sessionStorage.getItem("token"); // Retrieve authentication token.
        const formData = new FormData(); // Create FormData object for file upload.
        formData.append('file', file); // Append the selected file.

        // Determine the correct API endpoint based on the selected user type.
        const endpoint = userType === 'student' ? '/users/upload-students' : '/users/upload-teachers';

        try {
            // Send POST request to the determined endpoint.
            await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Ensure correct content type for file uploads.
                    'Authorization': `Bearer ${token}` // Include authorization header.
                }
            });
            showSuccess(`${userType.charAt(0).toUpperCase() + userType.slice(1)}s uploaded successfully!`);
            // Reset form after successful upload.
            setFile(null);
            setFileName('');
            const fileInput = document.getElementById("file-upload");
            if(fileInput) fileInput.value = ''; // Clear the actual file input element.
        } catch (error) {
            // Display error message from backend or a generic fallback.
            showError(error.response?.data?.message || 'File upload failed.');
        } finally {
            setIsSubmitting(false); // Re-enable submit button.
        }
    };

    // Sample CSV content for student and teacher data.
    const studentCsvContent = "name,email,password,student_id,semester,year,department,class_advisor,boarding,phone,photo_url\nJohn Doe,john@example.com,pass123,12121,S1,1,Computer Science,Dr. Smith,Hosteller,1234567890,http://example.com/photo.jpg";
    const teacherCsvContent = "name,email,password,teacher_id,department,subjects\nJane Smith,jane@example.com,pass456,TCH_CS_01,Computer Science,\"Data Structures,Algorithms\"";

    /**
     * Initiates download of a sample CSV file based on the selected user type.
     */
    const downloadSample = () => {
        const content = userType === 'student' ? studentCsvContent : teacherCsvContent;
        const filename = `${userType}_sample.csv`;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link); // Temporarily append to document for download
        link.click(); // Programmatically click the link to trigger download
        document.body.removeChild(link); // Remove the link
    };

    return (
        <div className="p-6 max-w-4xl mx-auto grid gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-700">
                    <h1 className="text-lg font-medium text-slate-800 dark:text-white">Create Users via Bulk Upload</h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* User Type Selection: Radio buttons for Student or Teacher */}
                    <fieldset className="flex flex-col gap-2">
                        <legend className="text-sm font-medium text-slate-600 dark:text-gray-300 mb-1">Select User Type</legend>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="userType" value="student" checked={userType === 'student'} onChange={handleUserTypeChange} className="h-4 w-4 text-blue-600 border-slate-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700" />
                                <span className="text-sm text-slate-700 dark:text-gray-200">Student</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="userType" value="teacher" checked={userType === 'teacher'} onChange={handleUserTypeChange} className="h-4 w-4 text-blue-600 border-slate-300 dark:border-gray-600 focus:ring-blue-500 bg-white dark:bg-gray-700" />
                                <span className="text-sm text-slate-700 dark:text-gray-200">Teacher</span>
                            </label>
                        </div>
                    </fieldset>

                    {/* File Upload Section */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-600 dark:text-gray-300">Upload User Data File</label>
                            {/* Button to download sample CSV */}
                            <button type="button" onClick={downloadSample} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">
                                <Download size={14} />
                                Download Sample
                            </button>
                        </div>
                        <div className="relative flex items-center gap-3 border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700">
                            <UploadIcon className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                            {/* Hidden file input, styled by its parent label */}
                            <input type="file" id="file-upload" name="file" accept=".csv,.xlsx" onChange={handleFileChange} required className="absolute inset-0 opacity-0 cursor-pointer" />
                            <span className="truncate select-none text-slate-900 dark:text-white">{fileName || 'Choose CSV or XLSX file'}</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isSubmitting || !file} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Uploading…' : `Upload ${userType.charAt(0).toUpperCase() + userType.slice(1)}s`}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal for Success/Error Messages */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-gray-950/70 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="flex items-center gap-2">
                            {/* Icon changes based on modal type */}
                            {modalType === 'success' ? <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" /> : <AlertIcon className="w-5 h-5 text-red-600 dark:text-red-400" />}
                            <h3 id="modal-title" className="text-base font-semibold text-slate-800 dark:text-white">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-gray-300">{modalMessage}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={closeModal} className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 dark:hover:bg-gray-600 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddUser;
