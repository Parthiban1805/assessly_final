import axios from 'axios';
import { 
    CheckCircle as CheckIcon, 
    AlertCircle as AlertIcon,
    Upload as UploadIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AddStudyMaterial = () => {
    const { user } = useAuth(); // Get user from context
    const navigate = useNavigate();

    // Component State
    const [fileName, setFileName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formInput, setFormInput] = useState({
        department: '',
        subjectName: '',
        year: '',
    });

    // Suggestions State
    const [showDeptSuggestions, setShowDeptSuggestions] = useState(false);
    const [showSubjSuggestions, setShowSubjSuggestions] = useState(false);
    const [filteredDepts, setFilteredDepts] = useState([]);
    const [filteredSubjects, setFilteredSubjects] = useState([]);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'success' or 'error'
    const [modalMessage, setModalMessage] = useState('');

    // --- Mock Data ---
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
    };

    // Auto-populate department from user context if available
    useEffect(() => {
        if (user?.department) {
            setFormInput(prev => ({ ...prev, department: user.department }));
        }
    }, [user]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormInput(prev => {
            const newState = { ...prev, [name]: value };
            // When department or year changes, reset the subject
            if (name === 'department' || name === 'year') {
                newState.subjectName = '';
            }
            return newState;
        });

        if (name === 'department') {
            const filtered = departments.filter(d => d.toLowerCase().includes(value.toLowerCase()));
            setFilteredDepts(filtered);
            setShowDeptSuggestions(true);
        } else if (name === 'subjectName') {
            const yearSubjects = subjects[formInput.department]?.[formInput.year] || [];
            const filtered = yearSubjects.filter(s => s.toLowerCase().includes(value.toLowerCase()));
            setFilteredSubjects(filtered);
            setShowSubjSuggestions(true);
        }
    };
    
    const handleSuggestionClick = (value, field) => {
        setFormInput(prev => ({ ...prev, [field]: value }));
        if (field === 'department') {
            setShowDeptSuggestions(false);
            setFormInput(prev => ({ ...prev, subjectName: '', department: value }));
        } else {
            setShowSubjSuggestions(false);
        }
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        setFileName(file ? file.name : '');
    };

    const resetForm = () => {
        setFormInput({
            department: user?.department || '',
            subjectName: '',
            year: '',
        });
        setFileName('');
        const fileInput = document.getElementById('file-upload');
        if(fileInput) fileInput.value = '';
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!user?.teacher_id) {
            setModalType('error');
            setModalMessage('Could not verify teacher identity. Please log in again.');
            setShowModal(true);
            return;
        }

        const fileInput = event.target.elements.file;
        if (!fileInput.files[0]) {
            setModalType('error');
            setModalMessage('Please select a file to upload.');
            setShowModal(true);
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('teacher_id', user.teacher_id);
        formData.append('subjectName', formInput.subjectName);
        formData.append('year', formInput.year);
        formData.append('department', formInput.department);
        formData.append('file', fileInput.files[0]);

        try {
            const token = sessionStorage.getItem("token");
            await axios.post('http://localhost:5000/api/v1/study-materials/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': `Bearer ${token}`
                }
            });
            setModalType('success');
            setModalMessage('Study material uploaded successfully!');
            setShowModal(true);
            resetForm();
        } catch (error) {
            setModalType('error');
            setModalMessage(error.response?.data?.message || 'Failed to upload material.');
            setShowModal(true);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <div className="p-6 max-w-4xl mx-auto grid gap-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 flex flex-col gap-6">
                <header className="flex items-center justify-between pb-4 border-b border-slate-200">
                    <h1 className="text-md text-slate-600">You are adding material as <span className='font-medium'>{user?.name}</span></h1>
                </header>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* --- Main Details Grid --- */}
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="relative flex flex-col gap-1">
                            <label htmlFor="department" className="text-sm font-medium text-slate-600">Department</label>
                            <input type="text" id="department" name="department" value={formInput.department} onChange={handleInputChange} autoComplete="off" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
                            {showDeptSuggestions && filteredDepts.length > 0 && (
                                <div className="absolute top-full z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-auto">
                                    {filteredDepts.map((d) => <button type="button" key={d} onClick={() => handleSuggestionClick(d, 'department')} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100">{d}</button>)}
                                </div>
                            )}
                        </div>
                        
                        <div className="flex flex-col gap-1">
                            <label htmlFor="year" className="text-sm font-medium text-slate-600">Year</label>
                            <select id="year" name="year" value={formInput.year} onChange={handleInputChange} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
                                <option value="" disabled>Select Year</option>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                            </select>
                        </div>
                        
                        <div className="relative flex flex-col gap-1 md:col-span-2">
                            <label htmlFor="subjectName" className="text-sm font-medium text-slate-600">Subject Name</label>
                            <input type="text" id="subjectName" name="subjectName" value={formInput.subjectName} onChange={handleInputChange} disabled={!formInput.department || !formInput.year} autoComplete="off" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100"/>
                            {showSubjSuggestions && filteredSubjects.length > 0 && (
                                <div className="absolute top-full z-10 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-auto">
                                    {filteredSubjects.map((s) => <button type="button" key={s} onClick={() => handleSuggestionClick(s, 'subjectName')} className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-100">{s}</button>)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* --- File Upload Section --- */}
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-600">Upload Document (PDF)</label>
                        <div className="relative flex items-center gap-3 border border-slate-300 rounded-md px-3 py-2 text-sm">
                            <UploadIcon className="w-4 h-4 text-slate-500" />
                            <input type="file" id="file-upload" name="file" accept=".pdf" onChange={handleFileChange} required className="absolute inset-0 opacity-0 cursor-pointer"/>
                            <span className="truncate select-none">{fileName || 'Choose PDF file'}</span>
                        </div>
                    </div>
                    
                    {/* --- Submit Button --- */}
                    <div className="flex justify-end">
                        <button type="submit" disabled={isSubmitting} className="bg-blue-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-blue-700 transition disabled:opacity-60">
                            {isSubmitting ? 'Uploading…' : 'Upload Material'}
                        </button>
                    </div>
                </form>
            </div>

            {/* --- Modal --- */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                            {modalType === 'success' ? <CheckIcon className="w-5 h-5 text-green-600" /> : <AlertIcon className="w-5 h-5 text-red-600" />}
                            <h3 className="text-base font-semibold text-slate-800">{modalType === 'success' ? 'Success' : 'Error'}</h3>
                        </div>
                        <p className="text-sm text-slate-600">{modalMessage}</p>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowModal(false)} className="bg-slate-100 text-slate-700 px-4 py-1.5 rounded-md text-sm font-medium hover:bg-slate-200 transition">
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