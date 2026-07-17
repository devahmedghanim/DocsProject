import { Routes } from '@angular/router';
import { AdminPageComponent } from './pages/admin-page.component';
import { adminTokenGuard } from './guards/admin-token.guard';
import { GroupPageComponent } from './pages/group-page.component';
import { HomePageComponent } from './pages/home-page.component';
import { SectionPageComponent } from './pages/section-page.component';

//#region Edit By AI
export const routes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'PrivateSettings', component: AdminPageComponent, canActivate: [adminTokenGuard] },
  { path: ':groupRoute/:sectionRoute/:guideId', component: SectionPageComponent },
  { path: ':groupRoute/:sectionRoute', component: SectionPageComponent },
  { path: ':groupRoute', component: GroupPageComponent },
  { path: '**', redirectTo: '' },
];
//#endregion Edit By AI
