import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

import { environment } from '../../environments/environment';

const config = environment.firebase;

export const isFirebaseConfigured = Object.values(config).every((value) => value.trim().length > 0);

export const firebaseAuth = isFirebaseConfigured
  ? getAuth(getApps().length > 0 ? getApp() : initializeApp(config))
  : null;
