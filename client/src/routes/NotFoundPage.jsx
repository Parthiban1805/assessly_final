import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react'; // Icon for back button
import NotFoundIllustration from '../assets/404.svg'; // Using an abstract illustration for 404 page

/**
 * NotFoundPage component displays a user-friendly 404 error page.
 * It includes an illustration, an error message, and a button to navigate back.
 *
 * @returns {JSX.Element} The 404 Not Found UI.
 */
const NotFoundPage = () => {
  const navigate = useNavigate(); // Hook for programmatic navigation.

  /**
   * Navigates back one step in the browser's history.
   */
  const handleGoBack = () => {
    navigate(-1);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 dark:bg-gray-900 text-center p-4">
      <div className="max-w-md">
        <img
          src={NotFoundIllustration}
          alt="Page Not Found Illustration"
          className="mx-auto mb-8 w-64 h-auto"
        />

        <p className="mt-8 text-2xl font-bold tracking-tight text-slate-800 dark:text-white sm:text-3xl">
          Oops! Page not found.
        </p>
        <p className="mt-4 text-base text-slate-600 dark:text-gray-300">
          Sorry, we couldn’t find the page you’re looking for. The link may be broken or the page may have been moved.
        </p>

        {/* Button to go back to the previous page. */}
        <button
          onClick={handleGoBack}
          className="mt-8 inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <ArrowLeft size={18} />
          Go Back to Previous Page
        </button>
      </div>
    </div>
  );
};

export default NotFoundPage;
