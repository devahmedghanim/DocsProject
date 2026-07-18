import { Routes } from '@angular/router';
import { AdminPageComponent } from './pages/admin-page.component';
import { adminTokenGuard } from './guards/admin-token.guard';
import { HomePageComponent } from './pages/home-page.component';
import { DocsViewerShellComponent } from './pages/docs-viewer-shell.component';

//#region Edit By AI
export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'PrivateSettings', component: AdminPageComponent, canActivate: [adminTokenGuard] },
  { path: ':groupRoute/:sectionRoute/:guideId', component: DocsViewerShellComponent },
  { path: ':groupRoute/:sectionRoute', component: DocsViewerShellComponent },
  { path: ':groupRoute', component: DocsViewerShellComponent },
  { path: '**', redirectTo: '' },
];
//#endregion Edit By AI
