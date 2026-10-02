import { Routes } from '@angular/router';

// Screens of design D6; each page is lazy-loaded.
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'projects' },
  {
    path: 'projects',
    loadComponent: () =>
      import('./projects/project-list-page/project-list-page').then((m) => m.ProjectListPage),
  },
  {
    path: 'projects/:projectId',
    loadComponent: () =>
      import('./projects/project-detail-page/project-detail-page').then((m) => m.ProjectDetailPage),
  },
  {
    path: 'items/:itemId',
    loadComponent: () =>
      import('./items/item-detail-page/item-detail-page').then((m) => m.ItemDetailPage),
  },
  {
    path: 'listings/:listingId',
    loadComponent: () =>
      import('./listings/listing-detail-page/listing-detail-page').then((m) => m.ListingDetailPage),
  },
  { path: '**', redirectTo: 'projects' },
];
