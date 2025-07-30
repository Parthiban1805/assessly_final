import axios from 'axios';
import { 
    CheckCircle as CheckIcon, 
    AlertCircle as AlertIcon, 
    Upload as UploadIcon,
    Download
} from 'lucide-react';
import { useState } from 'react';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const AddUser = () => {
    const [fileName, setFileName] = useState('');
    const [userType, setUserType] = useState('student'); // 'student' or 'teacher'
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [file, setFile] = useState(null);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success' or 'error'
    const [modalMessage, setModalMessage] = useState('');

    const closeModal = () => setShowModal(false);
    const showSuccess = (msg) => {
        setModalType('success');
        setModalMessage(msg);
        setShowModal(true);
    };
    const showError = (msg) => {
        setModalType('error');
        setModalMessage(msg);
        setShowModal(true);
    };

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setFileName(selectedFile.name);
        }
    };

    const handleUserTypeChange = (event) => {
        setUserType(event.target.value);
        // Reset file input when user type changes to avoid confusion
        setFile(null);
        setFileName('');
        const fileInput = document.getElementById("file-upload");
        if(fileInput) fileInput.value = '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!file) {
            showError('Please select a file to upload.');
            return;
        }
        
        setIsSubmitting(true);
        const token = sessionStorage.getItem("token");
        const formData = new FormData();
        formData.append('file', file);
        
        // The backend endpoint likely differs for students and teachers
        const endpoint = userType === 'student' ? '/users/upload-students' : '/users/upload-teachers';

        try {
            await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            showSuccess(`${userType.charAt(0).toUpperCase() + userType.slice(1)}s uploaded successfully!`);
            setFile(null);
            setFileName('');
            const fileInput = document.getElementById("file-upload");
            if(fileInput) fileInput.value = '';
        } catch (error) {
            showError(error.response?.data?.message || 'File upload failed.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // --- Sample Data & Download Logic ---
    const studentCsvContent = "name,email,password,student_id,semester,year,department,class_advisor,boarding,phone,photo_url\nJohn Doe,john@example.com,pass123,12121,S1,1,Computer Science,Dr. Smith,Hosteller,1234567890,http://example.com/photo.jpg";
    const teacherCsvContent = "name,email,password,teacher_id,department,subjects\nJane Smith,jane@example.com,pass456,TCH_CS_01,Computer Science,\"Data Structures,Algorithms\"";

    const downloadSample = () => {
        const content = userType === 'student' ? studentCsvContent : teacherCsvContent;
        const filename = `${userType}_sample.csv`;
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 max-w-4xl mx-auto grid gap-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h1 className="text-lg font-medium text-slate-800">Create Users via Bulk Upload</h1>
                </header>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* User Type Selection */}
                    <fieldset className="flex flex-col gap-2">
                        <legend className="text-sm font-medium text-slate-600 mb-1">Select User Type</legend>
                        <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="userType" value="student" checked={userType === 'student'} onChange={handleUserTypeChange} className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                                <span className="text-sm text-slate-700">Student</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="userType" value="teacher" checked={userType === 'teacher'} onChange={handleUserTypeChange} className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                                <span className="text-sm text-slate-700">Teacher</span>
                            </label>
                        </div>
                    </fieldset>

                    {/* File Upload */}
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-slate-600">Upload User Data File</label>
                            <button type="button" onClick={downloadSample} className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
                                <Download size={14} />
                                Download Sample
                            </button>
                        </div>
                        <div className="relative flex items-center gap-3 border border-slate-300 rounded-md px-3 py-2 text-sm">
                            <UploadIcon className="w-4 h-4 text-slate-500" />
                            <input type="file" id="file-upload" name="file" accept=".csv,.xlsx" onChange={handleFileChange} required className="absolute inset-0 opacity-0 cursor-pointer" />
                            <span className="truncate select-none">{fileName || 'Choose CSV or XLSX file'}</span>
                        </div>
                    </div>

                    {/* Submit Button */}
                    <div className="flex justify-end pt-2">
                        <button type="submit" disabled={isSubmitting || !file} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                            {isSubmitting ? 'Uploading…' : `Upload ${userType.charAt(0).toUpperCase() + userType.slice(1)}s`}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center gap-2">
                            {modalType === 'success' ? <CheckIcon className="w-5 h-5 text-green-600" /> : <AlertIcon className="w-5 h-5 text-red-600" />}
                            <h3 className="text-base font-semibold text-slate-800">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{modalMessage}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={closeModal} className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 transition">
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