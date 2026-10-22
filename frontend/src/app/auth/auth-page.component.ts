import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { User } from 'firebase/auth';

import { AuthApiService, type AuthIdentity } from '../services/auth-api.service';
import { AuthService } from '../services/auth.service';

type AuthMode = 'sign-in' | 'register';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section class="auth-card" aria-labelledby="auth-title">
      <p class="eyebrow">Event Memory</p>

      @if (authService.currentUser(); as user) {
        <h1 id="auth-title">Hola, {{ user.email }}</h1>
        <p>Tu cuenta está conectada.</p>
        @if (identity(); as verifiedIdentity) {
          <p class="success" role="status">
            Identidad verificada por el backend: {{ verifiedIdentity.uid }}
          </p>
        } @else if (verificationInProgress()) {
          <p class="hint" role="status">Verificando tu identidad con el backend…</p>
        } @else {
          <p class="field-error" role="alert">{{ errorMessage() }}</p>
        }
        <button type="button" (click)="logout()" [disabled]="loading()">Cerrar sesión</button>
      } @else {
        <h1 id="auth-title">{{ mode() === 'sign-in' ? 'Inicia sesión' : 'Crea tu cuenta' }}</h1>
        <p class="intro">
          {{ mode() === 'sign-in'
            ? 'Accede para empezar a preparar vuestro espacio.'
            : 'Regístrate para empezar a preparar vuestro espacio.' }}
        </p>

        @if (!authService.isConfigured) {
          <p class="notice" role="status">
            Falta la configuración local de Firebase. Sigue los pasos de desarrollo local para
            conectarla.
          </p>
        }

        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <label for="email">Correo electrónico</label>
          <input id="email" type="email" formControlName="email" autocomplete="email" />
          @if (form.controls.email.touched && form.controls.email.invalid) {
            <p class="field-error">Escribe un correo electrónico válido.</p>
          }

          <label for="password">Contraseña</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            [attr.autocomplete]="mode() === 'sign-in' ? 'current-password' : 'new-password'"
          />
          @if (mode() === 'register' && form.controls.password.touched && form.controls.password.invalid) {
            <p class="field-error">La contraseña debe tener al menos 6 caracteres.</p>
          }

          @if (errorMessage()) {
            <p class="field-error" role="alert">{{ errorMessage() }}</p>
          }

          <button type="submit" [disabled]="loading() || form.invalid || !authService.isConfigured">
            {{ loading() ? 'Un momento…' : mode() === 'sign-in' ? 'Entrar' : 'Crear cuenta' }}
          </button>
        </form>

        <button class="link-button" type="button" (click)="toggleMode()">
          {{ mode() === 'sign-in' ? '¿Aún no tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión' }}
        </button>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .auth-card {
      box-sizing: border-box;
      max-width: 480px;
      margin: 2rem auto;
      padding: 2rem;
      border: 1px solid #ded5cb;
      border-radius: 14px;
      background: #fffdf9;
    }
    .eyebrow { color: #8b5e52; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; }
    h1 { margin: 0.5rem 0 0.75rem; color: #332a28; font-family: Georgia, serif; font-size: 2.25rem; font-weight: 400; }
    .intro, .hint { color: #665c58; line-height: 1.6; }
    form { display: grid; gap: 0.65rem; margin-top: 1.5rem; }
    label { margin-top: 0.5rem; color: #332a28; font-weight: 600; }
    input { box-sizing: border-box; width: 100%; padding: 0.75rem; border: 1px solid #b9ada5; border-radius: 6px; font: inherit; }
    button { padding: 0.75rem 1rem; border: 0; border-radius: 6px; background: #8b5e52; color: white; cursor: pointer; font: inherit; }
    button:disabled { cursor: wait; opacity: 0.6; }
    .link-button { margin-top: 1rem; padding: 0; background: transparent; color: #70473d; text-decoration: underline; }
    .field-error { margin: 0; color: #a12d2d; font-size: 0.9rem; }
    .notice { padding: 0.75rem; border-radius: 6px; background: #f5ead5; color: #59451f; line-height: 1.5; }
    .success { color: #28613b; overflow-wrap: anywhere; }
    @media (max-width: 520px) { .auth-card { margin: 1rem 0; padding: 1.25rem; } }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  readonly authService = inject(AuthService);
  readonly mode = signal<AuthMode>('sign-in');
  readonly loading = signal(false);
  readonly verificationInProgress = signal(false);
  readonly errorMessage = signal('');
  readonly identity = signal<AuthIdentity | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      this.identity.set(null);
      this.errorMessage.set('');
      if (user) void this.verifyIdentity(user);
    });
  }

  toggleMode(): void {
    this.mode.update((mode) => (mode === 'sign-in' ? 'register' : 'sign-in'));
    this.form.controls.password.setValidators([
      Validators.required,
      ...(this.mode() === 'register' ? [Validators.minLength(6)] : []),
    ]);
    this.form.controls.password.updateValueAndValidity();
    this.errorMessage.set('');
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.errorMessage.set('');
    this.identity.set(null);
    const { email, password } = this.form.getRawValue();

    try {
      if (this.mode() === 'register') {
        await this.authService.register(email, password);
      } else {
        await this.authService.signIn(email, password);
      }
    } catch {
      this.errorMessage.set(
        'No se pudo completar la operación. Comprueba los datos y que Firebase y el backend estén configurados.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async logout(): Promise<void> {
    this.loading.set(true);
    try {
      await this.authService.signOut();
      this.identity.set(null);
    } catch {
      this.errorMessage.set('No se pudo cerrar la sesión. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  private async verifyIdentity(user: User): Promise<void> {
    this.verificationInProgress.set(true);
    try {
      const idToken = await user.getIdToken();
      this.identity.set(await this.authApi.verifyIdentity(idToken));
    } catch {
      this.errorMessage.set(
        'La sesión está iniciada, pero el backend no pudo verificar la identidad. Comprueba su configuración.',
      );
    } finally {
      this.verificationInProgress.set(false);
    }
  }
}
