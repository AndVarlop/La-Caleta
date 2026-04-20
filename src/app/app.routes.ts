import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/auth/register/register').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/shell/shell').then((m) => m.ShellComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then((m) => m.DashboardPage),
      },
      {
        path: 'transactions',
        loadComponent: () => import('./pages/transactions/transactions').then((m) => m.TransactionsPage),
      },
      {
        path: 'transactions/new',
        loadComponent: () =>
          import('./pages/transactions/transaction-form').then((m) => m.TransactionFormPage),
      },
      {
        path: 'transactions/:id',
        loadComponent: () =>
          import('./pages/transactions/transaction-form').then((m) => m.TransactionFormPage),
      },
      {
        path: 'categories',
        loadComponent: () => import('./pages/categories/categories').then((m) => m.CategoriesPage),
      },
      {
        path: 'accounts',
        loadComponent: () => import('./pages/accounts/accounts').then((m) => m.AccountsPage),
      },
      {
        path: 'pockets',
        loadComponent: () => import('./pages/pockets/pockets').then((m) => m.PocketsPage),
      },
      {
        path: 'reports',
        loadComponent: () => import('./pages/reports/reports').then((m) => m.ReportsPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./pages/settings/settings').then((m) => m.SettingsPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./pages/profile/profile').then((m) => m.ProfilePage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
