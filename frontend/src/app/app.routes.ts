import { Routes } from '@angular/router';
import { AuthPageComponent } from './auth/auth-page.component';
import { authGuard } from './auth/auth.guard';
import { DashboardPageComponent } from './dashboard/dashboard-page.component';

export const routes: Routes = [
  { path: '', component: AuthPageComponent },
  {
    path: 'dashboard',
    component: DashboardPageComponent,
    canActivate: [authGuard],
  },
  { path: '**', redirectTo: '' },
];
