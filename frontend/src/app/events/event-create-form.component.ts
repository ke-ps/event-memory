import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { apiErrorMessage, apiFieldErrors } from '../core/api-error-messages';
import { EventApiService } from './event-api.service';
import { EventRead } from './event.models';

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.length > 0 && control.value.trim().length === 0 ? { blank: true } : null;
}

const API_FIELDS = {
  partnerOneName: 'details.partner_one_name',
  partnerTwoName: 'details.partner_two_name',
  eventDate: 'event_date',
} as const;

@Component({
  selector: 'app-event-create-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="create-event-title">
      <h2 id="create-event-title" i18n="@@events.create.title">Crea vuestra boda</h2>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="partner-one" i18n="@@events.create.partnerOne.label"
          >Nombre de la primera persona</label
        >
        <input id="partner-one" type="text" formControlName="partnerOneName" />
        @if (fieldError('partnerOneName'); as message) {
          <p class="field-error" id="partner-one-error">{{ message }}</p>
        }

        <label for="partner-two" i18n="@@events.create.partnerTwo.label"
          >Nombre de la segunda persona</label
        >
        <input id="partner-two" type="text" formControlName="partnerTwoName" />
        @if (fieldError('partnerTwoName'); as message) {
          <p class="field-error" id="partner-two-error">{{ message }}</p>
        }

        <label for="event-date" i18n="@@events.create.date.label"
          >Fecha de la boda (opcional)</label
        >
        <input id="event-date" type="date" formControlName="eventDate" />
        @if (apiErrors()['event_date']; as message) {
          <p class="field-error" id="event-date-error">{{ message }}</p>
        }

        @if (errorMessage()) {
          <p class="field-error" role="alert">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="saving() || form.invalid">
          @if (saving()) {
            <ng-container i18n="@@events.create.saving">Creando…</ng-container>
          } @else {
            <ng-container i18n="@@events.create.submit">Crear boda</ng-container>
          }
        </button>
      </form>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    h2 {
      font-family: Georgia, serif;
      font-size: 1.5rem;
      font-weight: 400;
    }
    form {
      display: grid;
      gap: 0.65rem;
    }
    label {
      margin-top: 0.5rem;
      font-weight: 600;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #b9ada5;
      border-radius: 6px;
      font: inherit;
    }
    button {
      padding: 0.75rem 1rem;
      border: 0;
      border-radius: 6px;
      background: #8b5e52;
      color: white;
      cursor: pointer;
      font: inherit;
    }
    button:disabled {
      cursor: wait;
      opacity: 0.6;
    }
    .field-error {
      margin: 0;
      color: #a12d2d;
      font-size: 0.9rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCreateFormComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventApi = inject(EventApiService);

  readonly created = output<EventRead>();
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly apiErrors = signal<Record<string, string>>({});

  readonly form = this.formBuilder.nonNullable.group({
    partnerOneName: ['', [Validators.required, Validators.maxLength(100), notBlank]],
    partnerTwoName: ['', [Validators.required, Validators.maxLength(100), notBlank]],
    eventDate: [''],
  });

  constructor() {
    for (const [controlName, apiField] of Object.entries(API_FIELDS)) {
      this.form
        .get(controlName)
        ?.valueChanges.pipe(takeUntilDestroyed())
        .subscribe(() => {
          this.apiErrors.update((errors) =>
            Object.fromEntries(Object.entries(errors).filter(([key]) => key !== apiField)),
          );
        });
    }
  }

  fieldError(controlName: 'partnerOneName' | 'partnerTwoName'): string {
    return this.nameError(controlName) || this.apiErrors()[API_FIELDS[controlName]] || '';
  }

  private nameError(controlName: 'partnerOneName' | 'partnerTwoName'): string {
    const control = this.form.controls[controlName];
    if (!control.touched || control.valid) return '';
    if (control.hasError('maxlength')) {
      return $localize`:@@events.create.name.tooLong:El nombre es demasiado largo.`;
    }
    return $localize`:@@events.create.name.required:Escribe un nombre.`;
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.errorMessage.set('');
    this.apiErrors.set({});
    const { partnerOneName, partnerTwoName, eventDate } = this.form.getRawValue();

    try {
      const event = await this.eventApi.create({
        event_type: 'wedding',
        details: {
          partner_one_name: partnerOneName.trim(),
          partner_two_name: partnerTwoName.trim(),
        },
        event_date: eventDate || null,
      });
      this.created.emit(event);
    } catch (error) {
      const fieldErrors = apiFieldErrors(error);
      this.apiErrors.set(fieldErrors);
      const shown = Object.values(API_FIELDS).some((field) => field in fieldErrors);
      if (!shown) {
        this.errorMessage.set(apiErrorMessage(error));
      }
    } finally {
      this.saving.set(false);
    }
  }
}
