import { Injectable, signal } from '@angular/core';

//#region Edit By AI
export type Lang = 'ar' | 'en';

@Injectable({ providedIn: 'root' })
export class UiStateService {
    readonly lang = signal<Lang>((localStorage.getItem('npms_lang') as Lang) || 'ar');

    constructor() {
        this.applyToDocument(this.lang());
    }

    setLang(lang: Lang): void {
        this.lang.set(lang);
        localStorage.setItem('npms_lang', lang);
        this.applyToDocument(lang);
    }

    private applyToDocument(lang: Lang): void {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
}
//#endregion Edit By AI
