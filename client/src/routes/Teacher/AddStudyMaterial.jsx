import axios from 'axios';
import {
    CheckCircle as CheckIcon,
    AlertCircle as AlertIcon,
    Upload as UploadIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext'; // Authentication context hook
import { API_BASE_URL } from '../../config/constants'; // Import the common API base URL

/**
 * AddStudyMaterial component allows teachers to upload study materials (PDFs)
 * and associate them with a specific department, subject, and academic year.
 * It auto-populates the teacher's department and provides subject suggestions.
 *
 * @returns {JSX.Element} The study material upload form.
 */
const AddStudyMaterial = () => {
    const { user } = useAuth(); // Get authenticated user details from AuthContext.
    const navigate = useNavigate(); // Hook for programmatic navigation.

    // Component States.
    const [fileName, setFileName] = useState(''); // Name of the selected file for display.
    const [isSubmitting, setIsSubmitting] = useState(false); // Flag for submission in progress.

    // Form Input States.
    const [formInput, setFormInput] = useState({
        department: '',
        subjectName: '',
        year: '',
    });

    // Suggestion States for dropdowns.
    const [showDeptSuggestions, setShowDeptSuggestions] = useState(false); // Controls department suggestions visibility.
    const [showSubjSuggestions, setShowSubjSuggestions] = useState(false); // Controls subject suggestions visibility.
    const [filteredDepts, setFilteredDepts] = useState([]); // Filtered department list for suggestions.
    const [filteredSubjects, setFilteredSubjects] = useState([]); // Filtered subject list for suggestions.

    // Modal States for success/error messages.
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success' or 'error'.
    const [modalMessage, setModalMessage] = useState('');

    // --- Mock Data for Departments and Subjects ---
    // In a real application, these would likely be fetched from an API.
    const departments = ['Computer Science', 'Cyber Security', 'AIML', 'AIDS', 'IT', 'CA'];
    const subjects = {
        'Computer Science': {
            '1': ['Programming Basics', 'Discrete Mathematics', 'Introduction to Computer Systems', 'Fundamentals of Data Communication','Software Engineering Principles'],
            '2': ['Data Structures', 'Algorithms', 'Operating Systems', 'Database Systems','Computer Architecture'],
            '3': ['Artificial Intelligence', 'Machine Learning', 'Cloud Computing', 'Cyber Security','Big Data Analytics']
        },
        'IT': {
            '1': ['IT Fundamentals', 'Digital Electronics', 'Mathematics I', 'Physics'],
            '2': ['Web Development', 'Data Structures', 'Computer Networks', 'DBMS'],
            '3': ['Cloud Computing', 'Information Security', 'Data Mining', 'Mobile Computing']
        },
        // Add more departments and their subjects/years as needed
        'Cyber Security': {
            '1': ['Cybersecurity Fundamentals', 'Networking Basics', 'Operating Systems Concepts'],
            '2': ['Ethical Hacking', 'Digital Forensics', 'Cryptography'],
            '3': ['Web Security', 'Cloud Security', 'Malware Analysis']
        },
        'AIML': {
            '1': ['Introduction to AI', 'Python Programming', 'Linear Algebra'],
            '2': ['Machine Learning Algorithms', 'Deep Learning', 'Natural Language Processing'],
            '3': ['Computer Vision', 'Reinforcement Learning', 'AI Ethics']
        },
        'AIDS': {
            '1': ['Data Science Fundamentals', 'Statistics for Data Science', 'Database Management'],
            '2': ['Data Mining', 'Big Data Technologies', 'Data Visualization'],
            '3': ['Predictive Analytics', 'Time Series Analysis', 'Business Intelligence']
        },
        'CA': {
            '1': ['Financial Accounting', 'Business Law', 'Economics'],
            '2': ['Cost Accounting', 'Auditing', 'Taxation'],
            '3': ['Financial Management', 'Strategic Management', 'Advanced Accounting']
        },
    };


    /**
     * Effect hook to auto-populate the department field from the authenticated user's data
     * when the component mounts or user data becomes available.
     */
    useEffect(() => {
        if (user?.department) {
            setFormInput(prev => ({ ...prev, department: user.department }));
        }
    }, [user]); // Dependency: user object from AuthContext.

    /**
     * Handles changes to form input fields. Manages suggestions for department and subject.
     * Resets subject name if department or year changes.
     * @param {Event} e - The change event from the input element.
     */
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormInput(prev => {
            const newState = { ...prev, [name]: value };
            // When department or year changes, reset the subject field.
            if (name === 'department' || name === 'year') {
                newState.subjectName = '';
            }
            return newState;
        });

        // Handle department suggestions.
        if (name === 'department') {
            const filtered = departments.filter(d => d.toLowerCase().includes(value.toLowerCase()));
            setFilteredDepts(filtered);
            setShowDeptSuggestions(true);
        }
        // Handle subject suggestions.
        else if (name === 'subjectName') {
            // Get subjects relevant to the currently selected department and year.
            const yearSubjects = subjects[formInput.department]?.[formInput.year] || [];
            const filtered = yearSubjects.filter(s => s.toLowerCase().includes(value.toLowerCase()));
            setFilteredSubjects(filtered);
            setShowSubjSuggestions(true);
        }
    };

    /**
     * Handles clicking on a suggestion (department or subject).
     * Updates the corresponding form field and hides suggestions.
     * @param {string} value - The selected suggestion value.
     * @param {string} field - The name of the form field ('department' or 'subjectName').
     */
    const handleSuggestionClick = (value, field) => {
        setFormInput(prev => ({ ...prev, [field]: value }));
        if (field === 'department') {
            setShowDeptSuggestions(false);
            setFormInput(prev => ({ ...prev, subjectName: '', department: value })); // Reset subject if department changes.
        } else {
            setShowSubjSuggestions(false);
        }
    };

    /**
     * Handles changes to the file input, updating the displayed file name.
     * @param {Event} event - The file input change event.
     */
    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setFileName(file ? file.name : '');
    };

    /**
     * Resets all form fields and the file input.
     */
    const resetForm = () => {
        setFormInput({
            department: user?.department || '', // Reset department to user's default if available.
            subjectName: '',
            year: '',
        });
        setFileName('');
        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = ''; // Clear the actual file input element.
    };

    /**
     * Handles the form submission for uploading study material.
     * Validates input, sends data (including file) to the backend, and provides feedback via modal.
     *
     * @param {Event} event - The form submission event.
     */
    const handleSubmit = async (event) => {
        event.preventDefault();
        // Basic validation: Ensure teacher ID is available.
        if (!user?.teacher_id) {
            setModalType('error');
            setModalMessage('Could not verify teacher identity. Please log in again.');
            setShowModal(true);
            return;
        }

        const fileInput = event.target.elements.file;
        // Validate: Ensure a file has been selected.
        if (!fileInput.files[0]) {
            setModalType('error');
            setModalMessage('Please select a file to upload.');
            setShowModal(true);
            return;
        }

        setIsSubmitting(true); // Disable button during submission.
        const formData = new FormData(); // Create FormData object for file upload.
        formData.append('teacher_id', user.teacher_id); // Append teacher ID.
        formData.append('subjectName', formInput.subjectName);
        formData.append('year', formInput.year);
        formData.append('department', formInput.department);
        formData.append('file', fileInput.files[0]); // Append the selected file.

        try {
            const token = sessionStorage.getItem("token"); // Retrieve authentication token.
            // Send POST request to upload study materials.
            await axios.post(`${API_BASE_URL}/study-materials/`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data', // Essential for file uploads.
                    'Authorization': `Bearer ${token}` // Include authorization header.
                }
            });
            setModalType('success');
            setModalMessage('Study material uploaded successfully!');
            setShowModal(true);
            resetForm(); // Reset form on successful upload.
        } catch (error) {
            console.error('Error uploading material:', error);
            // Set error message from API response or a generic one.
            setModalType('error');
            setModalMessage(error.response?.data?.message || 'Failed to upload material.');
            setShowModal(true);
        } finally {
            setIsSubmitting(false); // Re-enable button.
        }
    };

    return (
        <div className="p-6 max-w-4xl mx-auto grid gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-slate-200 dark:border-gray-700 shadow-sm p-6 flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-gray-700">
                    <h1 className="text-md text-slate-600 dark:text-gray-300">You are adding material as <span className='font-medium text-slate-700 dark:text-white'>{user?.name}</span></h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* --- Main Details Grid --- */}
                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Department Input with Suggestions */}
                        <div className="relative flex flex-col gap-1">
                            <label htmlFor="department" className="text-sm font-medium text-slate-600 dark:text-gray-300">Department</label>
                            <input type="text" id="department" name="department" value={formInput.department} onChange={handleInputChange} autoComplete="off" required className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"
                                   onFocus={() => setShowDeptSuggestions(true)} onBlur={() => setTimeout(() => setShowDeptSuggestions(false), 100)} // Delay hiding suggestions for click event
                            />
                            {showDeptSuggestions && filteredDepts.length > 0 && (
                                <div className="absolute top-full z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-auto">
                                    {filteredDepts.map((d) => <button type="button" key={d} onClick={() => handleSuggestionClick(d, 'department')} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-700 dark:text-gray-200">{d}</button>)}
                                </div>
                            )}
                        </div>

                        {/* Year Select */}
                        <div className="flex flex-col gap-1">
                            <label htmlFor="year" className="text-sm font-medium text-slate-600 dark:text-gray-300">Year</label>
                            <select id="year" name="year" value={formInput.year} onChange={handleInputChange} required className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-slate-900 dark:text-white">
                                <option value="" disabled>Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                {/* Add more years if needed */}
                            </select>
                        </div>

                        {/* Subject Name Input with Suggestions */}
                        <div className="relative flex flex-col gap-1 md:col-span-2">
                            <label htmlFor="subjectName" className="text-sm font-medium text-slate-600 dark:text-gray-300">Subject Name</label>
                            <input type="text" id="subjectName" name="subjectName" value={formInput.subjectName} onChange={handleInputChange} disabled={!formInput.department || !formInput.year} autoComplete="off" required className="w-full border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500"
                                   onFocus={() => setShowSubjSuggestions(true)} onBlur={() => setTimeout(() => setShowSubjSuggestions(false), 100)} // Delay hiding suggestions
                            />
                            {showSubjSuggestions && filteredSubjects.length > 0 && (
                                <div className="absolute top-full z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-md shadow-lg max-h-48 overflow-auto">
                                    {filteredSubjects.map((s) => <button type="button" key={s} onClick={() => handleSuggestionClick(s, 'subjectName')} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-gray-700/50 text-slate-700 dark:text-gray-200">{s}</button>)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- File Upload Section --- */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-600 dark:text-gray-300">Upload Document (PDF)</label>
                        <div className="relative flex items-center gap-3 border border-slate-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-gray-700">
                            <UploadIcon className="w-4 h-4 text-slate-500 dark:text-gray-400" />
                            {/* Hidden file input, styled by its parent label */}
                            <input type="file" id="file-upload" name="file" accept=".pdf" onChange={handleFileChange} required className="absolute inset-0 opacity-0 cursor-pointer"/>
                            <span className="truncate select-none text-slate-900 dark:text-white">{fileName || 'Choose PDF file'}</span>
                        </div>
                    </div>

                    {/* --- Submit Button --- */}
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? 'Uploading…' : 'Upload Material'}
                        </button>
                    </div>
                </form>
            </div>

            {/* --- Modal for Success/Error Messages --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-gray-950/70 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
                        <div className="flex items-center gap-2">
                            {/* Icon changes based on modal type */}
                            {modalType === 'success' ? <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" /> : <AlertIcon className="w-5 h-5 text-red-600 dark:text-red-400" />}
                            <h3 id="modal-title" className="text-base font-semibold text-slate-800 dark:text-white">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-gray-300">{modalMessage}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-200 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 dark:hover:bg-gray-600 transition">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AddStudyMaterial;
