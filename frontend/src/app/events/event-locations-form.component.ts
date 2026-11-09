import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage, apiFieldErrors } from '../core/api-error-messages';
import { EventApiService } from './event-api.service';
import { notBlank } from './event-form-errors';
import { EventLocationWrite, EventRead } from './event.models';

const MAX_LOCATIONS = 10;

/** The inputs of every row: form control, API field, DOM id prefix, input type and label. */
const LOCATION_FIELDS = [
  {
    control: 'label',
    apiField: 'label',
    idPrefix: 'location-label',
    type: 'text',
    label: $localize`:@@events.locations.label.label:Etiqueta (por ejemplo, Ceremonia)`,
  },
  {
    control: 'venueName',
    apiField: 'venue_name',
    idPrefix: 'location-venue',
    type: 'text',
    label: $localize`:@@events.locations.venue.label:Nombre del lugar`,
  },
  {
    control: 'address',
    apiField: 'address',
    idPrefix: 'location-address',
    type: 'text',
    label: $localize`:@@events.locations.address.label:Dirección`,
  },
  {
    control: 'startTime',
    apiField: 'start_time',
    idPrefix: 'location-time',
    type: 'time',
    label: $localize`:@@events.locations.time.label:Hora (opcional)`,
  },
] as const;

type LocationField = (typeof LOCATION_FIELDS)[number];

/** True for `locations.<row>.<field>` keys, which a row field shows next to its input. */
function isRowFieldKey(key: string): boolean {
  // hasVisibleFieldError does not apply: its keys are plain field names, these are indexed by row.
  const [root, index, apiField] = key.split('.');
  return (
    root === 'locations' &&
    /^\d+$/.test(index) &&
    LOCATION_FIELDS.some((field) => field.apiField === apiField)
  );
}

@Component({
  selector: 'app-event-locations-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <section aria-labelledby="edit-locations-title">
      <h2 id="edit-locations-title" i18n="@@events.locations.title">Lugares de la boda</h2>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <p class="hint" i18n="@@events.locations.hint">
          La hora de cada lugar es opcional. Úsala si la ceremonia y la celebración son a horas
          distintas
        </p>

        @for (row of rows.controls; track row; let i = $index) {
          <fieldset class="location-row" [formGroup]="row">
            <legend i18n="@@events.locations.row">Lugar {{ i + 1 }}</legend>

            @for (field of fields; track field.control) {
              <label [for]="field.idPrefix + '-' + i">{{ field.label }}</label>
              <input
                [id]="field.idPrefix + '-' + i"
                [type]="field.type"
                [formControlName]="field.control"
              />
              @if (fieldError(i, field); as message) {
                <p class="field-error" [id]="field.idPrefix + '-' + i + '-error'">{{ message }}</p>
              }
            }

            <div class="row-actions">
              <button type="button" [disabled]="saving() || $first" (click)="move(i, -1)">
                <ng-container i18n="@@events.locations.moveUp">Subir</ng-container>
              </button>
              <button type="button" [disabled]="saving() || $last" (click)="move(i, 1)">
                <ng-container i18n="@@events.locations.moveDown">Bajar</ng-container>
              </button>
              <button type="button" [disabled]="saving()" (click)="remove(i)">
                <ng-container i18n="@@events.locations.remove">Quitar</ng-container>
              </button>
            </div>
          </fieldset>
        }

        <button type="button" [disabled]="saving() || rows.length >= maxLocations" (click)="add()">
          <ng-container i18n="@@events.locations.addRow">Añadir lugar</ng-container>
        </button>

        @if (errorMessage()) {
          <p class="field-error" role="alert">{{ errorMessage() }}</p>
        }

        <button type="submit" [disabled]="saving()">
          @if (saving()) {
            <ng-container i18n="@@events.locations.saving">Guardando…</ng-container>
          } @else {
            <ng-container i18n="@@events.locations.submit">Guardar</ng-container>
          }
        </button>
        <button type="button" [disabled]="saving()" (click)="cancelled.emit()">
          <ng-container i18n="@@events.locations.cancel">Cancelar</ng-container>
        </button>
      </form>
    </section>
  `,
  styleUrl: './event-form.css',
  styles: `
    fieldset {
      display: grid;
      gap: 0.65rem;
      margin: 0;
      padding: 0.75rem;
      border: 1px solid #b9ada5;
      border-radius: 6px;
    }
    .row-actions {
      display: flex;
      gap: 0.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventLocationsFormComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly eventApi = inject(EventApiService);

  readonly event = input.required<EventRead>();
  readonly saved = output<EventRead>();
  readonly cancelled = output<void>();
  readonly saving = signal(false);
  readonly errorMessage = signal('');
  readonly apiErrors = signal<Record<string, string>>({});
  readonly maxLocations = MAX_LOCATIONS;
  readonly fields = LOCATION_FIELDS;

  readonly rows = this.formBuilder.array([this.createRow()]);
  readonly form = this.formBuilder.group({ locations: this.rows });

  constructor() {
    this.rows.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.apiErrors.set({});
      this.errorMessage.set('');
    });
  }

  ngOnInit(): void {
    const locations = this.event().locations;
    if (locations.length === 0) return;
    this.rows.clear({ emitEvent: false });
    for (const location of locations) {
      this.rows.push(
        this.createRow({
          label: location.label,
          venueName: location.venue_name,
          address: location.address,
          startTime: location.start_time?.slice(0, 5) ?? '',
        }),
        { emitEvent: false },
      );
    }
  }

  createRow(value = { label: '', venueName: '', address: '', startTime: '' }) {
    return this.formBuilder.nonNullable.group({
      label: [value.label, [Validators.required, Validators.maxLength(60), notBlank]],
      venueName: [value.venueName, [Validators.required, Validators.maxLength(150), notBlank]],
      address: [value.address, [Validators.required, Validators.maxLength(300), notBlank]],
      startTime: [value.startTime],
    });
  }

  add(): void {
    this.rows.push(this.createRow());
  }

  move(index: number, offset: -1 | 1): void {
    const row = this.rows.at(index);
    this.rows.removeAt(index);
    this.rows.insert(index + offset, row);
  }

  remove(index: number): void {
    this.rows.removeAt(index);
  }

  fieldError(index: number, field: LocationField): string {
    return (
      this.clientError(index, field) ||
      this.apiErrors()[`locations.${index}.${field.apiField}`] ||
      ''
    );
  }

  private clientError(index: number, field: LocationField): string {
    const control = this.rows.at(index).controls[field.control];
    if (!control.touched || control.valid) return '';
    return control.hasError('maxlength')
      ? $localize`:@@events.locations.tooLong:Este texto es demasiado largo.`
      : $localize`:@@events.locations.required:Rellena este campo.`;
  }

  async submit(): Promise<void> {
    if (this.saving()) return;
    if (this.rows.invalid) {
      this.rows.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set('');
    this.apiErrors.set({});
    const locations: EventLocationWrite[] = this.rows.getRawValue().map((row) => ({
      label: row.label.trim(),
      venue_name: row.venueName.trim(),
      address: row.address.trim(),
      start_time: row.startTime || null,
    }));

    try {
      this.saved.emit(await this.eventApi.updateLocations({ locations }));
    } catch (error) {
      const fieldErrors = apiFieldErrors(error);
      this.apiErrors.set(fieldErrors);
      if (!Object.keys(fieldErrors).some(isRowFieldKey)) {
        this.errorMessage.set(apiErrorMessage(error));
      }
    } finally {
      this.saving.set(false);
    }
  }
}
