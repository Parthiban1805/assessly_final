import { Loader2 } from 'lucide-react';

/**
 * Loader component displays a spinning animation and a "Loading" message.
 * It's designed to be a full-page overlay or a prominent loading indicator.
 *
 * @returns {JSX.Element} The loading indicator UI.
 */
const Loader = () => {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] w-full bg-slate-50 dark:bg-gray-900 p-4 font-sans">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 dark:text-blue-400" />
                <p className="text-slate-500 dark:text-gray-400 font-medium">Loading</p>
            </div>
        </div>
    );
};

export default Loader;
