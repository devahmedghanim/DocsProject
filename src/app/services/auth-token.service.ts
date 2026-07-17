import { Injectable } from '@angular/core';

//#region Edit By AI
@Injectable({ providedIn: 'root' })
export class AuthTokenService {
    private readonly tokenKey = 'npms_admin_access_token';
    private readonly legacyTokenKeys = ['npms_admin_token', 'npms_admin_accessToken', 'npms_admin_jwt'];

    getToken(): string {
        const direct = localStorage.getItem(this.tokenKey)?.trim() || '';
        if (direct) {
            return direct;
        }

        for (const legacyKey of this.legacyTokenKeys) {
            const legacyToken = localStorage.getItem(legacyKey)?.trim() || '';
            if (legacyToken) {
                // Migrate legacy keys to the current storage key to keep old sessions valid.
                localStorage.setItem(this.tokenKey, legacyToken);
                localStorage.removeItem(legacyKey);
                return legacyToken;
            }
        }

        return '';
    }

    setToken(token: string): void {
        const normalizedToken = token.trim();
        if (!normalizedToken) {
            localStorage.removeItem(this.tokenKey);
            return;
        }

        localStorage.setItem(this.tokenKey, normalizedToken);
    }

    clear(): void {
        localStorage.removeItem(this.tokenKey);
        for (const legacyKey of this.legacyTokenKeys) {
            localStorage.removeItem(legacyKey);
        }
    }
}
//#endregion Edit By AI
