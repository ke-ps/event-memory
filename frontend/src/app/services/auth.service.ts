import { Injectable, signal } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
  type UserCredential,
} from 'firebase/auth';

import { firebaseAuth, isFirebaseConfigured } from './firebase-auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly isConfigured = isFirebaseConfigured;
  readonly currentUser = signal<User | null>(null);
  private readonly initialAuthState: Promise<User | null>;

  constructor() {
    if (!firebaseAuth) {
      this.initialAuthState = Promise.resolve(null);
      return;
    }

    const auth = firebaseAuth;
    this.initialAuthState = new Promise((resolve) => {
      let isInitialState = true;
      onAuthStateChanged(
        auth,
        (user) => {
          this.currentUser.set(user);
          if (isInitialState) {
            isInitialState = false;
            resolve(user);
          }
        },
        () => {
          if (isInitialState) {
            isInitialState = false;
            resolve(null);
          }
        },
      );
    });
  }

  waitForInitialAuthState(): Promise<User | null> {
    return this.initialAuthState;
  }

  register(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.requireAuth(), email, password);
  }

  signIn(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.requireAuth(), email, password);
  }

  signOut(): Promise<void> {
    return signOut(this.requireAuth());
  }

  private requireAuth() {
    if (!firebaseAuth) {
      throw new Error('Firebase Authentication no está configurado.');
    }

    return firebaseAuth;
  }
}
