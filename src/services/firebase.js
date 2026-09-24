import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Platform } from "react-native";

import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);

// `getReactNativePersistence` depende do AsyncStorage e não existe no build
// de navegador do SDK — na web a sessão fica no localStorage do browser.
export const auth = initializeAuth(app, {
    persistence:
      Platform.OS === "web"
        ? browserLocalPersistence
        : getReactNativePersistence(AsyncStorage),
});

export const db = getFirestore(app);
