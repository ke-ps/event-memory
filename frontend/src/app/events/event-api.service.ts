import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { EventCreateRequest, EventRead, EventUpdateRequest } from './event.models';

@Injectable({ providedIn: 'root' })
export class EventApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  async create(request: EventCreateRequest): Promise<EventRead> {
    const headers = await this.authHeaders();
    return firstValueFrom(
      this.http.post<EventRead>(`${environment.apiBaseUrl}/events`, request, { headers }),
    );
  }

  async getMine(): Promise<EventRead | null> {
    const headers = await this.authHeaders();
    try {
      return await firstValueFrom(
        this.http.get<EventRead>(`${environment.apiBaseUrl}/events/me`, { headers }),
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(request: EventUpdateRequest): Promise<EventRead> {
    const headers = await this.authHeaders();
    return firstValueFrom(
      this.http.put<EventRead>(`${environment.apiBaseUrl}/events/me`, request, { headers }),
    );
  }

  async deleteMine(): Promise<void> {
    const headers = await this.authHeaders();
    await firstValueFrom(
      this.http.delete<void>(`${environment.apiBaseUrl}/events/me`, { headers }),
    );
  }

  private async authHeaders(): Promise<HttpHeaders> {
    const user = this.auth.currentUser();
    if (!user) {
      throw new Error('not_authenticated');
    }
    const token = await user.getIdToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
