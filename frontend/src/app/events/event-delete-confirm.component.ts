import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';

import { apiErrorMessage } from '../core/api-error-messages';
import { EventApiService } from './event-api.service';

@Component({
  selector: 'app-event-delete-confirm',
  standalone: true,
  template: `
    <section aria-labelledby="delete-event-title">
      <h2 id="delete-event-title" i18n="@@events.delete.title">¿Eliminar vuestra boda?</h2>
      <p i18n="@@events.delete.warning">
        Se borrará vuestra boda definitivamente. No se puede deshacer.
      </p>
      @if (errorMessage()) {
        <p class="error" role="alert">{{ errorMessage() }}</p>
      }
      <div class="actions">
        <button
          class="cancel-delete"
          type="button"
          [disabled]="deleting()"
          (click)="cancelled.emit()"
          i18n="@@events.delete.cancel"
        >
          Cancelar
        </button>
        <button class="confirm-delete" type="button" [disabled]="deleting()" (click)="confirm()">
          @if (deleting()) {
            <ng-container i18n="@@events.delete.deleting">Eliminando…</ng-container>
          } @else {
            <ng-container i18n="@@events.delete.confirm">Sí, eliminar</ng-container>
          }
        </button>
      </div>
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
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
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
    .error {
      color: #a12d2d;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDeleteConfirmComponent {
  private readonly eventApi = inject(EventApiService);

  readonly deleted = output<void>();
  readonly cancelled = output<void>();
  readonly deleting = signal(false);
  readonly errorMessage = signal('');

  async confirm(): Promise<void> {
    if (this.deleting()) return;

    this.deleting.set(true);
    this.errorMessage.set('');
    try {
      await this.eventApi.deleteMine();
      this.deleted.emit();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        this.deleted.emit();
        return;
      }
      this.errorMessage.set(apiErrorMessage(error));
    } finally {
      this.deleting.set(false);
    }
  }
}
