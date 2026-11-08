import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AuthIdentity {
  uid: string;
  email: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  verifyIdentity(idToken: string): Promise<AuthIdentity> {
    return firstValueFrom(
      this.http.get<AuthIdentity>(`${environment.apiBaseUrl}/auth/me`, {
        headers: new HttpHeaders({ Authorization: `Bearer ${idToken}` }),
      }),
    );
  }
}
