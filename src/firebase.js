// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAom9e5ALgyG8TbMud6pW_bxoKjdIe7Wfk",
  authDomain: "artale-rj-pq-tool.firebaseapp.com",
  databaseURL: "https://artale-rj-pq-tool-default-rtdb.firebaseio.com",
  projectId: "artale-rj-pq-tool",
  storageBucket: "artale-rj-pq-tool.firebasestorage.app",
  messagingSenderId: "336364377892",
  appId: "1:336364377892:web:999294991ba654fae945b1",
  measurementId: "G-5KHRY7081B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);