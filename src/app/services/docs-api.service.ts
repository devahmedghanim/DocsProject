import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, firstValueFrom, from, of } from 'rxjs';
import { API_RUNTIME_CONFIG } from '../config/api-runtime.config';
import { Group, Guide, Section } from '../models';

//#region Edit By AI
@Injectable({ providedIn: 'root' })
export class DocsApiService {
    private readonly http = inject(HttpClient);
    private readonly runtime = API_RUNTIME_CONFIG;
    private readonly apiBaseUrl = this.runtime.docsBaseUrl;
    private readonly groupsUrl = this.runtime.groupsUrl;
    private readonly sectionsUrl = this.runtime.sectionsUrl;
    private readonly guidesBaseUrl = this.runtime.guidesBaseUrl;
    private readonly uploadsBaseUrl = this.runtime.uploadsBaseUrl;

    getGroups(): Observable<Group[]> {
        return this.http.get<Group[]>(this.withCacheBust(this.groupsUrl)).pipe(catchError(() => of([])));
    }

    getSections(): Observable<Section[]> {
        return this.http.get<Section[]>(this.withCacheBust(this.sectionsUrl)).pipe(catchError(() => of([])));
    }

    getGuides(route: string): Observable<Guide[]> {
        return this.http.get<Guide[]>(this.withCacheBust(this.guidesUrl(route))).pipe(catchError(() => of([])));
    }

    saveSection(formData: FormData): Observable<unknown> {
        return from(this.persistSection(formData));
    }

    saveGroup(formData: FormData): Observable<unknown> {
        return from(this.persistGroup(formData));
    }

    saveGuide(formData: FormData): Observable<unknown> {
        return from(this.persistGuide(formData));
    }

    reorderGroups(groups: Group[]): Observable<unknown> {
        return from(this.persistGroupReorder(groups));
    }

    reorderSections(sections: Section[]): Observable<unknown> {
        return from(this.persistSectionReorder(sections));
    }

    deleteSection(route: string): Observable<unknown> {
        return from(this.persistSectionDeletion(route));
    }

    deleteGroup(route: string): Observable<unknown> {
        return from(this.persistGroupDeletion(route));
    }

    deleteGuide(route: string, id: string): Observable<unknown> {
        return from(this.persistGuideDeletion(route, id));
    }

    async uploadGuideMedia(route: string, guideNumber: number, lang: 'ar' | 'en', file: File): Promise<{ type: 'image' | 'video' | 'gif'; src: string }> {
        if (this.shouldUseApi()) {
            const form = new FormData();
            form.append('route', route);
            form.append('guideNumber', String(guideNumber));
            form.append('lang', lang);
            form.append('file', file, file.name);

            const uploaded = await firstValueFrom(
                this.http.post<{ type: 'image' | 'video' | 'gif'; src: string }>(`${this.apiBaseUrl}/media/upload`, form)
            );

            return uploaded;
        }

        const normalizedRoute = route.trim().replace(/^\/+|\/+$/g, '');
        const normalizedNumber = String(Math.max(1, Number(guideNumber) || 1));
        const type = this.detectMediaType(file);
        const extension = this.resolveExtension(file.name, type);
        const fileName = `${type}${extension}`;
        const directoryUrl = `${this.uploadsBaseUrl}/${normalizedRoute}/${normalizedNumber}/${lang}`;
        const relativePath = `uploads/${normalizedRoute}/${normalizedNumber}/${lang}/${fileName}`;

        await this.ensureCollectionPath(directoryUrl);
        await this.putBinary(`/${relativePath}`, file, file.type || this.defaultContentType(type));

        return { type, src: relativePath };
    }

    private async persistSection(formData: FormData): Promise<{ ok: true }> {
        if (this.shouldUseApi()) {
            await firstValueFrom(this.http.post(`${this.apiBaseUrl}/sections/save`, formData));
            return { ok: true };
        }

        const sections = await firstValueFrom(this.getSections());
        const originalRoute = String(formData.get('original_route') ?? '').trim();
        const route = String(formData.get('route') ?? '').trim();

        if (!route) {
            throw new Error('Route is required');
        }

        const payload: Section = {
            id: route,
            route,
            icon: String(formData.get('icon') ?? '📄') || '📄',
            order: Number(formData.get('order') ?? sections.length + 1) || sections.length + 1,
            groupRoute: String(formData.get('group_route') ?? '').trim(),
            title: {
                ar: String(formData.get('title_ar') ?? '').trim(),
                en: String(formData.get('title_en') ?? '').trim(),
            },
            desc: {
                ar: String(formData.get('desc_ar') ?? '').trim(),
                en: String(formData.get('desc_en') ?? '').trim(),
            },
        };

        if (originalRoute) {
            const index = sections.findIndex((section) => section.route === originalRoute);
            if (index < 0) {
                throw new Error('Section not found');
            }

            payload.order = Number(formData.get('order') ?? sections[index].order) || sections[index].order;
            const nextSections = [...sections];
            nextSections[index] = payload;
            await this.putJson(this.sectionsUrl, nextSections);

            if (originalRoute !== route) {
                const previousGuides = await firstValueFrom(this.getGuides(originalRoute));
                await this.putJson(this.guidesUrl(route), previousGuides);
                await this.deleteFile(this.guidesUrl(originalRoute));
            }

            return { ok: true };
        }

        await this.putJson(this.sectionsUrl, [...sections, payload]);
        await this.putJson(this.guidesUrl(route), []);
        return { ok: true };
    }

    private async persistGroup(formData: FormData): Promise<{ ok: true }> {
        if (this.shouldUseApi()) {
            await firstValueFrom(this.http.post(`${this.apiBaseUrl}/groups/save`, formData));
            return { ok: true };
        }

        const groups = await firstValueFrom(this.getGroups());
        const originalRoute = String(formData.get('original_route') ?? '').trim();
        const route = String(formData.get('route') ?? '').trim();

        if (!route) {
            throw new Error('Route is required');
        }

        const payload: Group = {
            id: route,
            route,
            icon: String(formData.get('icon') ?? '📂') || '📂',
            order: Number(formData.get('order') ?? groups.length + 1) || groups.length + 1,
            title: {
                ar: String(formData.get('title_ar') ?? '').trim(),
                en: String(formData.get('title_en') ?? '').trim(),
            },
            desc: {
                ar: String(formData.get('desc_ar') ?? '').trim(),
                en: String(formData.get('desc_en') ?? '').trim(),
            },
        };

        if (originalRoute) {
            const index = groups.findIndex((group) => group.route === originalRoute);
            if (index < 0) {
                throw new Error('Group not found');
            }

            payload.order = Number(formData.get('order') ?? groups[index].order) || groups[index].order;
            const nextGroups = [...groups];
            nextGroups[index] = payload;
            await this.putJson(this.groupsUrl, nextGroups);

            return { ok: true };
        }

        await this.putJson(this.groupsUrl, [...groups, payload]);
        return { ok: true };
    }

    private async persistGuide(formData: FormData): Promise<{ ok: true }> {
        if (this.shouldUseApi()) {
            await firstValueFrom(this.http.post(`${this.apiBaseUrl}/guides/save`, formData));
            return { ok: true };
        }

        const route = String(formData.get('route') ?? '').trim();
        if (!route) {
            throw new Error('Route is required');
        }

        const guides = await firstValueFrom(this.getGuides(route));
        const id = String(formData.get('id') ?? '').trim();
        const existingMedia = id ? guides.find((guide) => guide.id === id)?.media ?? {} : {};
        const nextMedia = { ...existingMedia } as Partial<Record<'ar' | 'en', { type: 'image' | 'video' | 'gif'; src: string }>>;

        const arSrc = String(formData.get('media_src_ar') ?? '').trim().replace(/^\/+/, '');
        const enSrc = String(formData.get('media_src_en') ?? '').trim().replace(/^\/+/, '');
        const arType = (String(formData.get('media_type_ar') ?? 'image').trim() || 'image') as 'image' | 'video' | 'gif';
        const enType = (String(formData.get('media_type_en') ?? 'image').trim() || 'image') as 'image' | 'video' | 'gif';

        if (arSrc) {
            nextMedia.ar = { type: arType, src: arSrc };
        }

        if (enSrc) {
            nextMedia.en = { type: enType, src: enSrc };
        }

        const payload: Guide = {
            id: id || crypto.randomUUID(),
            number: Number(formData.get('number') ?? 1),
            title: {
                ar: String(formData.get('title_ar') ?? '').trim(),
                en: String(formData.get('title_en') ?? '').trim(),
            },
            desc: {
                ar: String(formData.get('desc_ar') ?? '').trim(),
                en: String(formData.get('desc_en') ?? '').trim(),
            },
            media: nextMedia,
        };

        const nextGuides = [...guides];
        const index = nextGuides.findIndex((guide) => guide.id === payload.id);
        if (index >= 0) {
            nextGuides[index] = payload;
        } else {
            nextGuides.push(payload);
        }

        await this.putJson(this.guidesUrl(route), nextGuides);
        return { ok: true };
    }

    private async persistGroupReorder(groups: Group[]): Promise<{ ok: true }> {
        const orders = groups.map((group, index) => ({ route: group.route, order: index + 1 }));

        if (this.shouldUseApi()) {
            try {
                await firstValueFrom(this.http.post(`${this.apiBaseUrl}/groups/reorder`, { orders }));
                return { ok: true };
            } catch {
                for (let i = 0; i < groups.length; i += 1) {
                    const group = groups[i];
                    const body = new FormData();
                    body.set('original_route', group.route);
                    body.set('route', group.route);
                    body.set('icon', group.icon || '📂');
                    body.set('title_ar', group.title.ar);
                    body.set('title_en', group.title.en);
                    body.set('desc_ar', group.desc.ar);
                    body.set('desc_en', group.desc.en);
                    body.set('order', String(i + 1));
                    await this.persistGroup(body);
                }
            }
            return { ok: true };
        }

        const currentGroups = await firstValueFrom(this.getGroups());
        const orderMap = new Map(orders.map((item) => [item.route, item.order]));
        const nextGroups = currentGroups.map((group) =>
            orderMap.has(group.route)
                ? { ...group, order: orderMap.get(group.route)! }
                : group
        );

        await this.putJson(this.groupsUrl, nextGroups);
        return { ok: true };
    }

    private async persistSectionReorder(sections: Section[]): Promise<{ ok: true }> {
        const orders = sections.map((section, index) => ({ route: section.route, order: index + 1 }));

        if (this.shouldUseApi()) {
            try {
                await firstValueFrom(this.http.post(`${this.apiBaseUrl}/sections/reorder`, { orders }));
                return { ok: true };
            } catch {
                for (let i = 0; i < sections.length; i += 1) {
                    const section = sections[i];
                    const body = new FormData();
                    body.set('original_route', section.route);
                    body.set('group_route', section.groupRoute);
                    body.set('route', section.route);
                    body.set('icon', section.icon || '📄');
                    body.set('title_ar', section.title.ar);
                    body.set('title_en', section.title.en);
                    body.set('desc_ar', section.desc.ar);
                    body.set('desc_en', section.desc.en);
                    body.set('order', String(i + 1));
                    await this.persistSection(body);
                }
            }
            return { ok: true };
        }

        const currentSections = await firstValueFrom(this.getSections());
        const orderMap = new Map(orders.map((item) => [item.route, item.order]));
        const nextSections = currentSections.map((section) =>
            orderMap.has(section.route)
                ? { ...section, order: orderMap.get(section.route)! }
                : section
        );

        await this.putJson(this.sectionsUrl, nextSections);
        return { ok: true };
    }

    private async persistSectionDeletion(route: string): Promise<{ ok: true }> {
        const normalizedRoute = route.trim();
        if (!normalizedRoute) {
            throw new Error('Route is required');
        }

        if (this.shouldUseApi()) {
            const formData = new FormData();
            formData.append('route', normalizedRoute);
            await firstValueFrom(this.http.post(`${this.apiBaseUrl}/sections/delete`, formData));
            return { ok: true };
        }

        const sections = await firstValueFrom(this.getSections());
        const nextSections = sections.filter((section) => section.route !== normalizedRoute);
        if (nextSections.length === sections.length) {
            throw new Error('Section not found');
        }

        await this.putJson(this.sectionsUrl, nextSections);
        await this.deleteFile(this.guidesUrl(normalizedRoute));
        await this.deleteFile(this.backendUrl(`/uploads/${normalizedRoute}`));

        return { ok: true };
    }

    private async persistGroupDeletion(route: string): Promise<{ ok: true }> {
        const normalizedRoute = route.trim();
        if (!normalizedRoute) {
            throw new Error('Route is required');
        }

        if (this.shouldUseApi()) {
            const formData = new FormData();
            formData.append('route', normalizedRoute);
            await firstValueFrom(this.http.post(`${this.apiBaseUrl}/groups/delete`, formData));
            return { ok: true };
        }

        const groups = await firstValueFrom(this.getGroups());
        const nextGroups = groups.filter((group) => group.route !== normalizedRoute);
        if (nextGroups.length === groups.length) {
            throw new Error('Group not found');
        }

        const sections = await firstValueFrom(this.getSections());
        const linkedSections = sections.filter((section) => section.groupRoute === normalizedRoute);

        for (const section of linkedSections) {
            await this.persistSectionDeletion(section.route);
        }

        await this.putJson(this.groupsUrl, nextGroups);
        return { ok: true };
    }

    private async persistGuideDeletion(route: string, id: string): Promise<{ ok: true }> {
        if (this.shouldUseApi()) {
            const formData = new FormData();
            formData.append('route', route);
            formData.append('id', id);
            await firstValueFrom(this.http.post(`${this.apiBaseUrl}/guides/delete`, formData));
            return { ok: true };
        }

        const guides = await firstValueFrom(this.getGuides(route));
        const guide = guides.find((entry) => entry.id === id);
        if (!guide) {
            throw new Error('Guide not found');
        }

        for (const folderPath of this.guideMediaFolders(route, guide)) {
            await this.deleteFile(this.backendUrl(`/${folderPath}`));
        }

        await this.putJson(
            this.guidesUrl(route),
            guides.filter((entry) => entry.id !== id)
        );
        return { ok: true };
    }

    private guidesUrl(route: string): string {
        return `${this.guidesBaseUrl}/${encodeURIComponent(route)}.json`;
    }

    private withCacheBust(url: string): string {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}_t=${Date.now()}`;
    }

    private detectMediaType(file: File): 'image' | 'video' | 'gif' {
        if (file.type.startsWith('video/')) {
            return 'video';
        }

        if (file.type === 'image/gif') {
            return 'gif';
        }

        return 'image';
    }

    private resolveExtension(fileName: string, type: 'image' | 'video' | 'gif'): string {
        if (type === 'video') {
            return '.mp4';
        }

        const extMatch = /\.([a-z0-9]+)$/i.exec(fileName);
        if (extMatch) {
            return `.${extMatch[1].toLowerCase()}`;
        }

        if (type === 'gif') {
            return '.gif';
        }

        return '.jpg';
    }

    private defaultContentType(type: 'image' | 'video' | 'gif'): string {
        if (type === 'video') {
            return 'video/mp4';
        }

        if (type === 'gif') {
            return 'image/gif';
        }

        return 'image/jpeg';
    }

    private async ensureCollectionPath(collectionUrl: string): Promise<void> {
        const targetUrl = new URL(collectionUrl, window.location.origin);
        const segments = targetUrl.pathname.split('/').filter(Boolean);
        const baseOrigin = targetUrl.origin;
        let currentPath = '';

        for (const segment of segments) {
            currentPath += `/${segment}`;
            const response = await fetch(`${baseOrigin}${currentPath}/`, { method: 'MKCOL' });
            if (response.ok || response.status === 405 || response.status === 301 || response.status === 302) {
                continue;
            }

            throw new Error(await this.responseMessage(response, `تعذر إنشاء المجلد ${currentPath}/`));
        }
    }

    private async putJson(url: string, data: unknown): Promise<void> {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
            },
            body: JSON.stringify(data, null, 4),
        });

        if (!response.ok) {
            throw new Error(await this.responseMessage(response, `تعذر حفظ الملف ${url}`));
        }
    }

    private async putBinary(url: string, file: File, contentType: string): Promise<void> {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': contentType,
            },
            body: file,
        });

        if (!response.ok) {
            throw new Error(await this.responseMessage(response, `تعذر رفع الملف ${url}`));
        }
    }

    private async deleteFile(url: string): Promise<void> {
        const response = await fetch(url, { method: 'DELETE' });
        if (response.ok || response.status === 404 || response.status === 405) {
            return;
        }

        throw new Error(await this.responseMessage(response, `تعذر حذف الملف ${url}`));
    }

    private async responseMessage(response: Response, fallback: string): Promise<string> {
        const raw = (await response.text()).trim();

        if (response.status === 405) {
            return `${fallback}. تأكد من تفعيل WebDAV والسماح بعمليات PUT و MKCOL و DELETE على IIS.`;
        }

        if (response.status === 401 || response.status === 403) {
            return `${fallback}. IIS رفض الكتابة على المسار المطلوب.`;
        }

        if (raw) {
            return `${fallback}. ${raw}`;
        }

        return `${fallback}. HTTP ${response.status}`;
    }

    private guideMediaFolders(route: string, guide: Guide): string[] {
        const normalizedRoute = route.trim().replace(/^\/+|\/+$/g, '');
        const folders = new Set<string>([`uploads/${normalizedRoute}/${guide.number}`]);

        for (const media of Object.values(guide.media ?? {})) {
            const src = media?.src?.trim().replace(/^\/+/, '');
            if (!src) {
                continue;
            }

            const segments = src.split('/').filter(Boolean);
            if (segments.length >= 4) {
                folders.add(segments.slice(0, -2).join('/'));
            }
        }

        return [...folders];
    }

    private backendUrl(path: string): string {
        return `${this.runtime.origin}${path}`;
    }

    private shouldUseApi(): boolean {
        return this.runtime.useApi;
    }
}
//#endregion Edit By AI
