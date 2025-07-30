import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CourseCard = ({ image, title, description, staff, subjectId }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const navigate = useNavigate();
  
  const handleEnterCourse = () => {
    // Navigate to the specific course page
    navigate(`/course/${subjectId}`);
  };
  
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg">
      
      {/* Image Section with Fallback */}
      <div className="relative w-full aspect-video bg-slate-200">
        {!imageError ? (
          <img 
            src={image} 
            alt={title} 
            // Smooth fade-in effect for the image
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`} 
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        ) : (
          // Fallback UI if image fails to load
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl font-bold text-slate-400">{title ? title.charAt(0) : "C"}</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-5 flex flex-col flex-grow">
        <h2 
          className="text-lg font-medium text-slate-800 truncate" 
          title={title} // Show full title on hover if truncated
        >
          {title}
        </h2>

        <p 
          className="text-sm text-slate-600 mt-1 line-clamp-2 flex-grow" 
          title={description} // Show full description on hover
        >
          {description}
        </p>

        <p className="text-xs text-slate-500 mt-3">
          Handled by: <span className="font-medium text-slate-600">{staff}</span>
        </p>
        
        {/* Footer with Button */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button 
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500" 
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