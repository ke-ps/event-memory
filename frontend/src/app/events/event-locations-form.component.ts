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

/** Form control name -> field name used by the API. */
const API_FIELDS = {
  label: 'label',
  venueName: 'venue_name',
  address: 'address',
  startTime: 'start_time',
} as const;

type FieldName = keyof typeof API_FIELDS;

const VISIBLE_API_ERROR = /^locations\.\d+\.(label|venue_name|address|start_time)$/;

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

            <label [for]="'location-label-' + i" i18n="@@events.locations.label.label"
              >Etiqueta (por ejemplo, Ceremonia)</label
            >
            <input [id]="'location-label-' + i" type="text" formControlName="label" />
            @if (fieldError(i, 'label'); as message) {
              <p class="field-error" [id]="'location-label-' + i + '-error'">{{ message }}</p>
            }

            <label [for]="'location-venue-' + i" i18n="@@events.locations.venue.label"
              >Nombre del lugar</label
            >
            <input [id]="'location-venue-' + i" type="text" formControlName="venueName" />
            @if (fieldError(i, 'venueName'); as message) {
              <p class="field-error" [id]="'location-venue-' + i + '-error'">{{ message }}</p>
            }

            <label [for]="'location-address-' + i" i18n="@@events.locations.address.label"
              >Dirección</label
            >
            <input [id]="'location-address-' + i" type="text" formControlName="address" />
            @if (fieldError(i, 'address'); as message) {
              <p class="field-error" [id]="'location-address-' + i + '-error'">{{ message }}</p>
            }

            <label [for]="'location-time-' + i" i18n="@@events.locations.time.label"
              >Hora (opcional)</label
            >
            <input [id]="'location-time-' + i" type="time" formControlName="startTime" />
            @if (fieldError(i, 'startTime'); as message) {
              <p class="field-error" [id]="'location-time-' + i + '-error'">{{ message }}</p>
            }

            <div class="row-actions">
              <button type="button" [disabled]="$first" (click)="move(i, -1)">
                <ng-container i18n="@@events.locations.moveUp">Subir</ng-container>
              </button>
              <button type="button" [disabled]="$last" (click)="move(i, 1)">
                <ng-container i18n="@@events.locations.moveDown">Bajar</ng-container>
              </button>
              <button type="button" (click)="remove(i)">
                <ng-container i18n="@@events.locations.remove">Quitar</ng-container>
              </button>
            </div>
          </fieldset>
        }

        <button
          type="button"
          [disabled]="rows.length >= maxLocations"
          (click)="rows.push(createRow())"
        >
          <ng-container i18n="@@events.locations.add">Añadir lugar</ng-container>
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
        <button type="button" (click)="cancelled.emit()">
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

  readonly rows = this.formBuilder.array([this.createRow()]);
  readonly form = this.formBuilder.group({ locations: this.rows });

  constructor() {
    this.rows.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.apiErrors.set({}));
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

  move(index: number, offset: -1 | 1): void {
    const row = this.rows.at(index);
    this.rows.removeAt(index);
    this.rows.insert(index + offset, row);
  }

  remove(index: number): void {
    this.rows.removeAt(index);
  }

  fieldError(index: number, field: FieldName): string {
    return (
      this.clientError(index, field) ||
      this.apiErrors()[`locations.${index}.${API_FIELDS[field]}`] ||
      ''
    );
  }

  private clientError(index: number, field: FieldName): string {
    const control = this.rows.at(index).controls[field];
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
      if (!Object.keys(fieldErrors).some((key) => VISIBLE_API_ERROR.test(key))) {
        this.errorMessage.set(apiErrorMessage(error));
      }
    } finally {
      this.saving.set(false);
    }
  }
}
