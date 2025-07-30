import { Loader2 } from 'lucide-react';

const Loader = () => {
    return (
        <div className="flex items-center rounded-lg justify-center min-h-[calc(100vh-4rem)] w-full bg-slate-50 p-4 font-sans">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                <p className="text-slate-500 font-medium">Loading</p>
            </div>
        </div>
    );
};

export default Loader;