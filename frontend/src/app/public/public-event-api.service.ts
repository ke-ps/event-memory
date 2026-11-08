import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { PublicEvent } from '../events/event.models';

@Injectable({ providedIn: 'root' })
export class PublicEventApiService {
  private readonly http = inject(HttpClient);

  async get(slug: string): Promise<PublicEvent | null> {
    try {
      return await firstValueFrom(
        this.http.get<PublicEvent>(
          `${environment.apiBaseUrl}/public/events/${encodeURIComponent(slug)}`,
        ),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }
}
