import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth"; // import signInWithPopup

const firebaseConfig = {
  apiKey: 'AIzaSyDTA1AflpFGBToJeVOKxnW5IGzqWkhrlHM',
  authDomain: 'auth-velalar.firebaseapp.com',
  projectId: 'auth-velalar', 
  storageBucket: 'auth-velalar.firebasestorage.app', 
  messagingSenderId: '407937097512', 
  appId: '1:407937097512:web:41904e4fb22ab3865fba1d', 
  measurementId: 'G-SRYWD8RTPY' 
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => {
  signInWithPopup(auth, googleProvider) // use googleProvider here
    .then((result) => {
      const user = result.user;
      console.log(user);
    })
    .catch((error) => {
      console.error(error.message);
    });
};

export { auth, googleProvider };
