import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, tap } from 'rxjs';
import { API_RUNTIME_CONFIG } from '../config/api-runtime.config';
import { AuthTokenService } from './auth-token.service';

interface LoginResponse {
    ok: boolean;
    user?: string;
    error?: string;
    token?: string;
    expiresInSeconds?: number;
}

interface StatusResponse {
    ok: boolean;
    authenticated: boolean;
    user?: string;
}

//#region Edit By AI
@Injectable({ providedIn: 'root' })
export class AdminAuthService {
    private readonly http = inject(HttpClient);
    private readonly tokenStore = inject(AuthTokenService);
    private readonly authBaseUrl = API_RUNTIME_CONFIG.authBaseUrl;
    private readonly authKey = 'npms_admin_authenticated';
    private readonly userKey = 'npms_admin_user';
    private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

    readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

    hasToken(): boolean {
        return Boolean(this.tokenStore.getToken());
    }

    checkStatus(): Observable<boolean> {
        return this.http.get<StatusResponse>(`${this.authBaseUrl}/status`).pipe(
            map((res) => Boolean(res.ok && res.authenticated)),
            tap((ok) => this.isAuthenticatedSubject.next(ok)),
            catchError(() => {
                this.tokenStore.clear();
                this.isAuthenticatedSubject.next(false);
                return of(false);
            })
        );
    }

    login(username: string, password: string): Observable<LoginResponse> {
        return this.http
            .post<LoginResponse>(
                `${this.authBaseUrl}/login`,
                {
                    username: username.trim(),
                    password,
                }
            )
            .pipe(
                tap((res) => {
                    if (res.ok && res.token) {
                        this.tokenStore.setToken(res.token);
                    } else {
                        this.tokenStore.clear();
                    }

                    this.isAuthenticatedSubject.next(Boolean(res.ok));
                }),
                catchError(() => of({ ok: false, error: 'فشل تسجيل الدخول' }))
            );
    }

    logout(): Observable<StatusResponse> {
        return this.http.post<StatusResponse>(`${this.authBaseUrl}/logout`, {}).pipe(
            tap(() => {
                this.tokenStore.clear();
                localStorage.removeItem(this.authKey);
                localStorage.removeItem(this.userKey);
                this.isAuthenticatedSubject.next(false);
            }),
            catchError(() => {
                this.tokenStore.clear();
                localStorage.removeItem(this.authKey);
                localStorage.removeItem(this.userKey);
                this.isAuthenticatedSubject.next(false);
                return of({ ok: true, authenticated: false });
            })
        );
    }
}
//#endregion Edit By AI
