import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

import { apiErrorMessage } from '../core/api-error-messages';
import { EventApiService } from './event-api.service';
import { EventRead } from './event.models';

@Component({
  selector: 'app-event-publication',
  standalone: true,
  template: `
    @if (event().status === 'published') {
      <p class="status" i18n="@@events.publication.published">Publicada</p>
      <p class="link">{{ publicLink() }}</p>
      <a [href]="publicLink()" target="_blank" rel="noopener" i18n="@@events.publication.view"
        >Ver página pública</a
      >
      <div class="actions">
        <button
          type="button"
          [disabled]="busy()"
          (click)="copyLink()"
          i18n="@@events.publication.copy"
        >
          Copiar enlace
        </button>
        <button
          type="button"
          [disabled]="busy()"
          (click)="change('unpublish')"
          i18n="@@events.publication.unpublish"
        >
          Despublicar
        </button>
      </div>
      @if (copyMessage()) {
        <p role="status">{{ copyMessage() }}</p>
      }
    } @else {
      <p class="status" i18n="@@events.publication.draft">Borrador</p>
      <div class="actions">
        <button
          type="button"
          [disabled]="busy() || !event().event_date"
          (click)="change('publish')"
          i18n="@@events.publication.publish"
        >
          Publicar
        </button>
      </div>
      @if (!event().event_date) {
        <p class="hint" i18n="@@events.publication.dateHint">Añade la fecha para poder publicar</p>
      }
    }
    @if (errorMessage()) {
      <p class="error" role="alert">{{ errorMessage() }}</p>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .link {
      overflow-wrap: anywhere;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
    .error {
      color: #a12d2d;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventPublicationComponent {
  private readonly eventApi = inject(EventApiService);

  readonly event = input.required<EventRead>();
  readonly changed = output<EventRead>();
  readonly busy = signal(false);
  readonly errorMessage = signal('');
  readonly copyMessage = signal('');
  readonly publicLink = computed(() => `${window.location.origin}/e/${this.event().slug}`);

  async change(action: 'publish' | 'unpublish'): Promise<void> {
    if (this.busy()) return;

    this.busy.set(true);
    this.errorMessage.set('');
    this.copyMessage.set('');
    try {
      this.changed.emit(
        action === 'publish' ? await this.eventApi.publish() : await this.eventApi.unpublish(),
      );
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error));
    } finally {
      this.busy.set(false);
    }
  }

  async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.publicLink());
      this.copyMessage.set($localize`:@@events.publication.copied:Enlace copiado`);
    } catch {
      this.copyMessage.set(
        $localize`:@@events.publication.copyFailed:No se pudo copiar. Copia el enlace a mano.`,
      );
    }
  }
}
