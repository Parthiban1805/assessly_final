import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * CourseCard component displays information about a single course and allows navigation to its details page.
 * It includes an image with a fallback for better UX.
 *
 * @param {object} props - The component props.
 * @param {string} props.image - URL for the course image.
 * @param {string} props.title - Title of the course.
 * @param {string} props.description - Short description of the course.
 * @param {string} props.staff - Name of the staff/teacher handling the course.
 * @param {string} props.subjectId - Unique identifier for the subject/course.
 * @returns {JSX.Element} The course card UI.
 */
const CourseCard = ({ image, title, description, staff, subjectId }) => {
  // State to track if the image has successfully loaded.
  const [imageLoaded, setImageLoaded] = useState(false);
  // State to track if there was an error loading the image.
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate(); // Hook for programmatic navigation.

  /**
   * Handles navigation to the specific course's detail page when the button is clicked.
   */
  const handleEnterCourse = () => {
    navigate(`/course/${subjectId}`);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">

      {/* Image Section with Fallback UI */}
      <div className="relative w-full aspect-video bg-slate-200 dark:bg-gray-700">
        {!imageError ? (
          // Render image if no error. Apply fade-in effect on load.
          <img
            src={image}
            alt={title}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImageLoaded(true)} // Set imageLoaded to true on successful load
            onError={() => setImageError(true)} // Set imageError to true on load failure
          />
        ) : (
          // Fallback UI if image fails to load. Displays the first letter of the title.
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-slate-400 dark:text-gray-500">{title ? title.charAt(0) : "C"}</span>
          </div>
        )}
      </div>

      {/* Content Section of the Card */}
      <div className="p-5 flex flex-col flex-grow">
        <h2
          className="text-lg font-medium text-slate-800 dark:text-white truncate"
          title={title} // Show full title on hover if it's truncated
        >
          {title}
        </h2>

        <p
          className="text-sm text-slate-600 dark:text-gray-300 mt-1 line-clamp-2 flex-grow"
          title={description} // Show full description on hover
        >
          {description}
        </p>

        <p className="text-xs text-slate-500 dark:text-gray-400 mt-3">
          Handled by: <span className="font-medium text-slate-600 dark:text-gray-300">{staff}</span>
        </p>

        {/* Footer with Enter Course Button */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
          <button
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 dark:hover:bg-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={handleEnterCourse}
          >
            Enter Course
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
