import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { apiErrorMessage, apiFieldErrors } from '../core/api-error-messages';
import { EventApiService } from './event-api.service';
import { clearApiErrorOnEdit, hasVisibleFieldError, notBlank } from './event-form-errors';
import { EventRead } from './event.models';

const API_FIELDS = {
  title: 'title',
  partnerOneName: 'details.partner_one_name',
  partnerTwoName: 'details.partner_two_name',
  eventDate: 'event_date',
  startTime: 'start_time',
  slug: 'slug',
} as const;

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Validates the normalized value (trimmed, lowercased), as it is sent on submit. */
function slugValidator(control: AbstractControl<string>): ValidationErrors | null {
  const slug = control.value.trim().toLowerCase();
  if (slug.length === 0) return { required: true };
  return slug.length < 3 || slug.length > 80 || !SLUG_PATTERN.test(slug)
    ? { slugFormat: true }
    : null;
}

type FieldName = keyof typeof API_FIELDS;

@Component({
  selector: 'app-event-edit-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="edit-event-title">
      <h2 id="edit-event-title" i18n="@@events.edit.title">Editar la boda</h2>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <label for="edit-title" i18n="@@events.edit.title.label">Título</label>
        <input id="edit-title" type="text" formControlName="title" />
        <p class="hint" i18n="@@events.edit.title.hint">
          Si lo dejas vacío, se usarán vuestros nombres
        </p>
        @if (fieldError('title'); as message) {
          <p class="field-error" id="edit-title-error">{{ message }}</p>
        }

        <label for="edit-slug" i18n="@@events.edit.slug.label">Dirección web</label>
        <div class="slug-field">
          <span>/e/</span>
          <input id="edit-slug" type="text" formControlName="slug" />
        </div>
        @if (event().status === 'published') {
          <p class="hint" i18n="@@events.edit.slug.lockedHint">
            Para cambiarla, despublica la boda
          </p>
        } @else {
          <p class="hint" i18n="@@events.edit.slug.hint">Así será el enlace de vuestra boda</p>
        }
        @if (fieldError('slug'); as message) {
          <p class="field-error" id="edit-slug-error">{{ message }}</p>
        }

        <label for="edit-partner-one" i18n="@@events.edit.partnerOne.label"
          >Nombre de la primera persona</label
        >
        <input id="edit-partner-one" type="text" formControlName="partnerOneName" />
        @if (fieldError('partnerOneName'); as message) {
          <p class="field-error" id="edit-partner-one-error">{{ message }}</p>
        }

        <label for="edit-partner-two" i18n="@@events.edit.partnerTwo.label"
          >Nombre de la segunda persona</label
        >
        <input id="edit-partner-two" type="text" formControlName="partnerTwoName" />
        @if (fieldError('partnerTwoName'); as message) {
          <p class="field-error" id="edit-partner-two-error">{{ message }}</p>
        }

        <label for="edit-event-date" i18n="@@events.edit.date.label"
          >Fecha de la boda (opcional)</label
        >
        <input id="edit-event-date" type="date" formControlName="eventDate" />
        @if (fieldError('eventDate'); as message) {
          <p class="field-error" id="edit-event-date-error">{{ message }}</p>
        }

        <label for="edit-start-time" i18n="@@events.edit.time.label"
          >Hora de inicio (opcional)</label
        >
        <input id="edit-start-time" type="time" formControlName="startTime" />
        @if (fieldError('startTime'); as message) {
          <p class="field-error" id="edit-start-time-error">{{ message }}</p>
        }

        @if (errorMessage()) {
          <p class="field-error" role="alert">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="saving()">
          @if (saving()) {
            <ng-container i18n="@@events.edit.saving">Guardando…</ng-container>
          } @else {
            <ng-container i18n="@@events.edit.submit">Guardar</ng-container>
          }
        </button>
        <button type="button" (click)="cancelled.emit()">
          <ng-container i18n="@@events.edit.cancel">Cancelar</ng-container>
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
    .slug-field {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .hint {
      margin: 0;
      font-size: 0.9rem;
    }
    .field-error {
      margin: 0;
      color: #a12d2d;
      font-size: 0.9rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEditFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventApi = inject(EventApiService);

  readonly event = input.required<EventRead>();
  readonly saved = output<EventRead>();
  readonly cancelled = output<void>();
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly apiErrors = signal<Record<string, string>>({});

  readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.maxLength(150)]],
    partnerOneName: ['', [Validators.required, Validators.maxLength(100), notBlank]],
    partnerTwoName: ['', [Validators.required, Validators.maxLength(100), notBlank]],
    eventDate: [''],
    startTime: [''],
    slug: ['', [slugValidator]],
  });

  constructor() {
    clearApiErrorOnEdit(this.form, API_FIELDS, this.apiErrors);
  }

  ngOnInit(): void {
    const event = this.event();
    this.form.setValue({
      title: event.title,
      partnerOneName: event.details.partner_one_name,
      partnerTwoName: event.details.partner_two_name,
      eventDate: event.event_date ?? '',
      startTime: event.start_time?.slice(0, 5) ?? '',
      slug: event.slug,
    });
    if (event.status === 'published') this.form.controls.slug.disable();
  }

  fieldError(controlName: FieldName): string {
    return this.clientError(controlName) || this.apiErrors()[API_FIELDS[controlName]] || '';
  }

  private clientError(controlName: FieldName): string {
    const control = this.form.controls[controlName];
    if (!control.touched || control.valid || control.disabled) return '';
    if (controlName === 'slug') {
      return control.hasError('required')
        ? $localize`:@@events.edit.slug.required:Escribe la dirección de tu boda.`
        : $localize`:@@events.edit.slug.invalid:Usa solo minúsculas, números y guiones (entre 3 y 80 caracteres).`;
    }
    if (control.hasError('maxlength')) {
      return controlName === 'title'
        ? $localize`:@@events.edit.title.tooLong:El título es demasiado largo.`
        : $localize`:@@events.edit.name.tooLong:El nombre es demasiado largo.`;
    }
    return $localize`:@@events.edit.name.required:Escribe un nombre.`;
  }

  async submit(): Promise<void> {
    if (this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.apiErrors.set({});
    const { title, partnerOneName, partnerTwoName, eventDate, startTime, slug } =
      this.form.getRawValue();

    try {
      const event = await this.eventApi.update({
        title: title.trim() || null,
        slug: slug.trim().toLowerCase(),
        details: {
          partner_one_name: partnerOneName.trim(),
          partner_two_name: partnerTwoName.trim(),
        },
        event_date: eventDate || null,
        start_time: startTime || null,
      });
      this.saved.emit(event);
    } catch (error) {
      const fieldErrors = apiFieldErrors(error);
      this.apiErrors.set(fieldErrors);
      if (!hasVisibleFieldError(fieldErrors, API_FIELDS)) {
        this.errorMessage.set(apiErrorMessage(error));
      }
    } finally {
      this.saving.set(false);
    }
  }
}
