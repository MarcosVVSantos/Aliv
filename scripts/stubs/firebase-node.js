// Substitui src/services/firebase.js no seed: mesma configuração, mas com o
// `getAuth` do SDK web em vez do Auth do React Native (que não roda no Node).
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

import { firebaseConfig } from '../../src/services/firebaseConfig.js';

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
