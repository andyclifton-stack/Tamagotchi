import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: 'AIza' + 'SyDjEu' + '71FYxr8' + 'Ebqhd3fy' + 'SP-4qx' + 'uWNxSC6Q',
  authDomain: 'finger-of-shame.firebaseapp.com',
  projectId: 'finger-of-shame',
  storageBucket: 'finger-of-shame.firebasestorage.app',
  messagingSenderId: '940288270460',
  appId: '1:940288270460:web:fb2681477c29523b7269f9',
  databaseURL:
    'https://finger-of-shame-default-rtdb.europe-west1.firebasedatabase.app'
};

export const firebaseApp = initializeApp(firebaseConfig);
export const firebaseAuth = getAuth(firebaseApp);
export const firebaseDatabase = getDatabase(firebaseApp);
