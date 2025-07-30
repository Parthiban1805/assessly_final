import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import NotFoundIllustration from '../assets/404.svg'; // Using the abstract illustration

const NotFoundPage = () => {
  // 1. Get the navigate function from the hook.
  const navigate = useNavigate();

  // 2. This function will navigate back one step in history.
  const handleGoBack = () => {
    navigate(-1);
  };

  // The component is now much simpler, with no useEffect or state needed.
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-4">
      <div className="max-w-md">
        <img 
          src={NotFoundIllustration} 
          alt="Page Not Found Illustration" 
          className="mx-auto mb-8 w-64 h-auto"
        />
        
        <p className="mt-8 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl">
          Oops! Page not found.
        </p>
        <p className="mt-4 text-base text-slate-600">
          Sorry, we couldn’t find the page you’re looking for. The link may be broken or the page may have been moved.
        </p>

        
        {/* 3. The button now calls our new handler function. */}
        <button
          onClick={handleGoBack}
          className="mt-8 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft size={18} />
          Go Back to Previous Page
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;