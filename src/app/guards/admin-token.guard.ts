import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';

//#region Edit By AI
export const adminTokenGuard: CanActivateFn = () => {
    const auth = inject(AdminAuthService);

    // No token: allow route so login shell appears.
    if (!auth.hasToken()) {
        return of(true);
    }

    // Token exists: resolve status before page activation to avoid login flash.
    return auth.checkStatus().pipe(
        map(() => true),
        catchError(() => of(true))
    );
};
//#endregion Edit By AI
