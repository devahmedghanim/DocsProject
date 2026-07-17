import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthTokenService } from './auth-token.service';

//#region Edit By AI
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
    const shouldAttachToken =
        req.url.startsWith('/api/') ||
        req.url.startsWith('/Api/api/') ||
        /^https?:\/\/[^/]+\/api\//i.test(req.url) ||
        /^https?:\/\/[^/]+\/Api\/api\//.test(req.url);

    if (!shouldAttachToken) {
        return next(req);
    }

    const tokenStore = inject(AuthTokenService);
    const token = tokenStore.getToken();
    if (!token) {
        return next(req);
    }

    const withAuth = req.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`,
        },
    });

    return next(withAuth);
};
//#endregion Edit By AI
