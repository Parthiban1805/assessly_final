import { create } from 'zustand';

const useProctoringStore = create((set) => ({
  mediaStream: null,
  setMediaStream: (stream) => set({ mediaStream: stream }),
  
  clearMediaStream: () => {
    const stream = useProctoringStore.getState().mediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    set({ mediaStream: null });
  },
}));

export default useProctoringStore;