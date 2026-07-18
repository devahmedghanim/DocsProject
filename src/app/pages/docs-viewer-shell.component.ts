import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription, forkJoin, of } from 'rxjs';
import { Group, Guide, Section } from '../models';
import { DocsApiService } from '../services/docs-api.service';
import { UiStateService } from '../services/ui-state.service';

//#region Edit By AI
@Component({
    selector: 'app-docs-viewer-shell',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <div class="docs-view-shell" [class.loading-active]="loading() && !viewStateLoaded()">
      <section class="docs-view-pane docs-group-pane" [class.is-active]="!sectionRoute()">
        <ng-container *ngIf="group() as currentGroup; else groupStateTpl">
          <nav class="breadcrumb">
            <a routerLink="/">{{ lang() === 'ar' ? 'الرئيسية' : 'Home' }}</a>
            <span class="sep">/</span>
            <span>{{ lang() === 'ar' ? currentGroup.title.ar : currentGroup.title.en }}</span>
          </nav>

          <section class="hero hero-home group-hero">
            <div class="hero-card">
              <h1>{{ currentGroup.icon || '📂' }} {{ lang() === 'ar' ? currentGroup.title.ar : currentGroup.title.en }}</h1>
              <div class="hero-stats">
                <div class="stat"><b>{{ filteredSections().length }}</b>{{ lang() === 'ar' ? 'قسم' : 'Sections' }}</div>
              </div>
            </div>
          </section>

          <section class="grid-wrap">
            <div class="grid-title">{{ lang() === 'ar' ? 'أقسام المجموعة' : 'Group Sections' }}</div>

            <div class="sections-grid" *ngIf="pagedSections().length; else groupEmptyTpl">
              <a class="section-card reveal" *ngFor="let sectionItem of pagedSections()" [routerLink]="'/' + currentGroup.route + '/' + sectionItem.route">
                <span class="arrow">{{ lang() === 'ar' ? '←' : '→' }}</span>
                <div class="section-card-top">
                  <div class="icon"><span class="icon-glyph">{{ sectionItem.icon || '📄' }}</span></div>
                  <div class="section-chip">{{ lang() === 'ar' ? currentGroup.title.ar : currentGroup.title.en }}</div>
                </div>
                <h3>{{ lang() === 'ar' ? sectionItem.title.ar : sectionItem.title.en }}</h3>
                <span class="count">{{ counts()[sectionItem.route] || 0 }} {{ lang() === 'ar' ? 'دليل' : 'guides' }}</span>
              </a>
            </div>

            <div class="pager" *ngIf="totalPages() > 1">
              <button type="button" class="pager-btn" (click)="goToPage(page() - 1)" [disabled]="page() === 1">{{ lang() === 'ar' ? 'السابق' : 'Previous' }}</button>
              <span class="pager-status">{{ page() }} / {{ totalPages() }}</span>
              <button type="button" class="pager-btn" (click)="goToPage(page() + 1)" [disabled]="page() === totalPages()">{{ lang() === 'ar' ? 'التالي' : 'Next' }}</button>
            </div>
          </section>
        </ng-container>
      </section>

      <section class="docs-view-pane docs-section-pane" [class.is-active]="!!sectionRoute()">
        <ng-container *ngIf="section() as currentSection; else sectionStateTpl">
          <ng-container *ngIf="group() as currentGroup">
            <nav class="breadcrumb" [class.breadcrumb-full]="isWideSection()">
              <a routerLink="/">{{ lang() === 'ar' ? 'الرئيسية' : 'Home' }}</a>
              <span class="sep">/</span>
              <a [routerLink]="'/' + currentGroup.route">{{ lang() === 'ar' ? currentGroup.title.ar : currentGroup.title.en }}</a>
              <span class="sep">/</span>
              <span>{{ lang() === 'ar' ? currentSection.title.ar : currentSection.title.en }}</span>
            </nav>

            <section class="hero section-hero-compact" [class.hero-full]="isWideSection()">
              <div class="hero-card">
                <h1>{{ currentSection.icon || '📄' }} {{ lang() === 'ar' ? currentSection.title.ar : currentSection.title.en }}</h1>
              </div>
            </section>

            <div class="section-layout" [class.section-layout-full]="isWideSection()">
              <div class="guides-main" [class.guides-main-wide]="isWideSection()">
                <article class="guide-card reveal" *ngFor="let guide of sortedGuides()" [id]="'guide-' + guide.id" [class.open]="isOpen(guide.id)">
                  <div class="guide-card-head" (click)="toggleGuide(guide.id)">
                    <div class="num-badge">{{ guide.number.toString().padStart(2, '0') }}</div>
                    <h3>{{ lang() === 'ar' ? guide.title.ar : guide.title.en }}</h3>
                    <div class="chev">⌄</div>
                  </div>

                  <div class="guide-card-body">
                    <div class="guide-card-inner">
                      <div class="desc ql-editor" [class.desc-rtl]="lang() === 'ar'" [class.desc-ltr]="lang() === 'en'" [innerHTML]="guideDescription(guide)"></div>

                      <ng-container *ngIf="currentMedia(guide) as media">
                        <div class="guide-media">
                          <button
                            type="button"
                            class="media-expand-btn"
                            (click)="openMediaPopup(media); $event.stopPropagation()"
                            [attr.aria-label]="lang() === 'ar' ? 'تكبير الوسائط' : 'Expand media'"
                          >
                            ⛶
                          </button>
                          <img *ngIf="!isVideoMedia(media)" [src]="mediaAssetUrl(media)" alt="guide media" loading="lazy" />
                          <video
                            *ngIf="isVideoMedia(media)"
                            #guideVideo
                            [src]="mediaAssetUrl(media)"
                            controls
                            preload="metadata"
                            controlsList="nodownload"
                            playsinline
                            (loadedmetadata)="setVideoDefaults(guideVideo)"
                          ></video>
                        </div>
                      </ng-container>
                    </div>
                  </div>
                </article>
              </div>

              <aside class="guide-list-panel">
                <h4>{{ lang() === 'ar' ? 'مراحل الدليل' : 'Guide Steps' }}</h4>
                <button class="guide-nav-item" type="button" *ngFor="let guide of sortedGuides()" [class.active]="isActiveGuide(guide.id)" (click)="focusGuide(guide.id)">
                  <span class="num">{{ guide.number.toString().padStart(2, '0') }}</span>
                  <span>{{ lang() === 'ar' ? guide.title.ar : guide.title.en }}</span>
                </button>
              </aside>
            </div>

            <nav class="section-footer-nav" [class.section-footer-nav-full]="isWideSection()">
              <a class="section-footer-link prev" *ngIf="prevSection() as prev; else noPrev" [routerLink]="'/' + prev.groupRoute + '/' + prev.route">
                <span class="label">{{ lang() === 'ar' ? 'القسم السابق' : 'Previous Section' }}</span>
                <span class="value">{{ prev.icon || '📄' }} {{ lang() === 'ar' ? prev.title.ar : prev.title.en }}</span>
              </a>
              <ng-template #noPrev>
                <div class="section-footer-link prev is-disabled" aria-disabled="true">
                  <span class="label">{{ lang() === 'ar' ? 'القسم السابق' : 'Previous Section' }}</span>
                  <span class="value">{{ lang() === 'ar' ? 'لا يوجد قسم سابق' : 'No previous section' }}</span>
                </div>
              </ng-template>

              <a class="section-footer-link next" *ngIf="nextSection() as next; else noNext" [routerLink]="'/' + next.groupRoute + '/' + next.route">
                <span class="label">{{ lang() === 'ar' ? 'القسم التالي' : 'Next Section' }}</span>
                <span class="value">{{ next.icon || '📄' }} {{ lang() === 'ar' ? next.title.ar : next.title.en }}</span>
              </a>
              <ng-template #noNext>
                <div class="section-footer-link next is-disabled" aria-disabled="true">
                  <span class="label">{{ lang() === 'ar' ? 'القسم التالي' : 'Next Section' }}</span>
                  <span class="value">{{ lang() === 'ar' ? 'لا يوجد قسم تالي' : 'No next section' }}</span>
                </div>
              </ng-template>
            </nav>

            <div class="media-preview-overlay" *ngIf="popupMedia() as preview" (click)="closeMediaPopup()">
              <div class="media-preview-dialog" (click)="$event.stopPropagation()">
                <button
                  type="button"
                  class="media-preview-close"
                  (click)="closeMediaPopup()"
                  [attr.aria-label]="lang() === 'ar' ? 'إغلاق المعاينة' : 'Close preview'"
                >
                  ×
                </button>

                <img *ngIf="!isVideoMedia(preview)" [src]="mediaAssetUrl(preview)" alt="media preview" />
                <video
                  *ngIf="isVideoMedia(preview)"
                  #previewVideo
                  [src]="mediaAssetUrl(preview)"
                  controls
                  autoplay
                  preload="metadata"
                  controlsList="nodownload"
                  playsinline
                  (loadedmetadata)="setVideoDefaults(previewVideo)"
                ></video>
              </div>
            </div>
          </ng-container>
        </ng-container>
      </section>

      <ng-template #groupEmptyTpl>
        <div class="empty-state">
          <div class="emoji">📄</div>
          <div>{{ lang() === 'ar' ? 'لا توجد أقسام داخل هذه المجموعة' : 'No sections in this group yet' }}</div>
        </div>
      </ng-template>

      <ng-template #groupStateTpl>
        <ng-container *ngIf="loading(); else notFoundTpl">
          <section class="grid-wrap">
            <div class="hero-card skeleton-card skeleton-hero"></div>
            <div class="grid-title skeleton skeleton-text skeleton-title"></div>
            <div class="sections-grid">
              <div class="section-card skeleton-card" *ngFor="let item of groupSkeletonItems()"></div>
            </div>
          </section>
        </ng-container>
      </ng-template>

      <ng-template #sectionStateTpl>
        <ng-container *ngIf="loading(); else sectionNotFoundTpl">
          <nav class="breadcrumb" [class.breadcrumb-full]="isWideSection()">
            <div class="skeleton skeleton-text" style="width: 82px"></div>
            <span class="sep">/</span>
            <div class="skeleton skeleton-text" style="width: 120px"></div>
            <span class="sep">/</span>
            <div class="skeleton skeleton-text" style="width: 140px"></div>
          </nav>

          <section class="hero section-hero-compact" [class.hero-full]="isWideSection()">
            <div class="hero-card skeleton-card skeleton-hero"></div>
          </section>

          <section class="section-layout" [class.section-layout-full]="isWideSection()">
            <div class="guides-main" [class.guides-main-wide]="isWideSection()">
              <article class="guide-card" *ngFor="let item of guideSkeletonItems()">
                <div class="guide-card-head">
                  <div class="skeleton" style="width: 16px; height: 16px; border-radius: 4px"></div>
                  <div class="skeleton skeleton-text" style="flex: 1; max-width: 58%"></div>
                  <div class="num-badge skeleton"></div>
                </div>
              </article>
            </div>

            <aside class="guide-list-panel">
              <div class="skeleton skeleton-text" style="width: 120px; margin-bottom: 14px"></div>
              <div class="skeleton-card" style="height: 52px; border-radius: 12px; margin-bottom: 10px" *ngFor="let item of guideSkeletonItems()"></div>
            </aside>
          </section>

          <nav class="section-footer-nav" [class.section-footer-nav-full]="isWideSection()">
            <div class="section-footer-link skeleton-card" style="height: 76px"></div>
            <div class="section-footer-link skeleton-card" style="height: 76px"></div>
          </nav>
        </ng-container>
      </ng-template>

      <ng-template #sectionNotFoundTpl>
        <div class="empty-state">
          <div class="emoji">📄</div>
          <div>{{ lang() === 'ar' ? 'القسم غير موجود' : 'Section not found' }}</div>
        </div>
      </ng-template>

      <ng-template #notFoundTpl>
        <div class="empty-state">
          <div class="emoji">📄</div>
          <div>{{ lang() === 'ar' ? 'المجموعة غير موجودة' : 'Group not found' }}</div>
        </div>
      </ng-template>
  `,
})
export class DocsViewerShellComponent implements OnInit, OnDestroy {
    private readonly api = inject(DocsApiService);
    private readonly route = inject(ActivatedRoute);
    private readonly ui = inject(UiStateService);

    private routeSub?: Subscription;
    private loadToken = 0;

    readonly lang = this.ui.lang;
    readonly loading = signal(true);
    readonly viewStateLoaded = signal(false);
    readonly isLoadingOverlayVisible = computed(() => this.loading() && !this.viewStateLoaded());
    readonly groupRoute = signal('');
    readonly sectionRoute = signal('');
    readonly guideSlug = signal('');
    readonly renderGroupRoute = signal('');
    readonly renderSectionRoute = signal('');
    readonly renderGuideSlug = signal('');
    readonly selectedGuide = signal('');
    readonly popupMedia = signal<{ type: 'image' | 'video' | 'gif'; src: string } | null>(null);
    readonly mediaRevision = signal(Date.now());
    readonly groups = signal<Group[]>([]);
    readonly sections = signal<Section[]>([]);
    readonly guides = signal<Guide[]>([]);
    readonly openMap = signal<Record<string, boolean>>({});
    readonly counts = signal<Record<string, number>>({});
    readonly page = signal(1);
    readonly pageSize = 10;
    readonly groupSkeletonItems = signal(Array.from({ length: 8 }));
    readonly guideSkeletonItems = signal(Array.from({ length: 2 }));

    readonly group = computed(() => this.groups().find((entry) => entry.route === this.renderGroupRoute()) ?? null);
    readonly section = computed(() => this.sections().find((entry) => entry.route === this.renderSectionRoute() && entry.groupRoute === this.renderGroupRoute()) ?? null);
    readonly sortedGuides = computed(() => [...this.guides()].sort((a, b) => a.number - b.number));
    readonly filteredSections = computed(() => this.sections().filter((entry) => entry.groupRoute === this.renderGroupRoute()).sort((a, b) => a.order - b.order));
    readonly pagedSections = computed(() => {
        const start = (this.page() - 1) * this.pageSize;
        return this.filteredSections().slice(start, start + this.pageSize);
    });
    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredSections().length / this.pageSize)));
    readonly isWideSection = computed(() => this.renderSectionRoute() === 'work-orders');
    readonly currentSectionIndex = computed(() => this.filteredSections().findIndex((entry) => entry.route === this.renderSectionRoute()));
    readonly hasGroupLoaded = computed(() => !!this.group());
    readonly hasSectionLoaded = computed(() => !!this.section());
    readonly prevSection = computed(() => {
        const index = this.currentSectionIndex();
        return index > 0 ? this.filteredSections()[index - 1] : null;
    });
    readonly nextSection = computed(() => {
        const index = this.currentSectionIndex();
        return index >= 0 && index < this.filteredSections().length - 1 ? this.filteredSections()[index + 1] : null;
    });

    ngOnInit(): void {
        this.routeSub = this.route.paramMap.subscribe((params) => {
            this.groupRoute.set(params.get('groupRoute') ?? '');
            this.sectionRoute.set(params.get('sectionRoute') ?? '');
            this.guideSlug.set(params.get('guideId') ?? '');
            this.page.set(1);
            this.load();
        });
    }

    ngOnDestroy(): void {
        this.routeSub?.unsubscribe();
    }

    goToPage(page: number): void {
        this.page.set(Math.min(this.totalPages(), Math.max(1, page)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    private load(): void {
        const token = ++this.loadToken;
        const groupSlug = this.groupRoute();
        const sectionSlug = this.sectionRoute();
        const guideId = this.guideSlug();

        const cachedGroups = this.api.peekGroups();
        const cachedSections = this.api.peekSections();

        if (cachedGroups.length) {
            this.groups.set(cachedGroups);
        }

        if (cachedSections.length) {
            this.sections.set(cachedSections);
        }

        if (sectionSlug) {
            const cachedGuides = this.api.peekGuides(sectionSlug);
            if (cachedGuides.length) {
                this.applyGuides(groupSlug, sectionSlug, guideId, cachedGuides);
                this.loading.set(false);
                this.viewStateLoaded.set(true);
            }
        } else if (cachedGroups.length && cachedSections.length) {
            this.renderGroupRoute.set(groupSlug);
            this.renderSectionRoute.set('');
            this.renderGuideSlug.set('');
            this.loadCounts(this.filteredSections());
            this.loading.set(false);
            this.viewStateLoaded.set(true);
        }

        if (sectionSlug) {
            forkJoin({
                groups: this.api.getGroups(),
                sections: this.api.getSections(),
                guides: this.api.getGuides(sectionSlug),
            }).subscribe({
                next: (result) => {
                    if (token !== this.loadToken) {
                        return;
                    }

                    this.groups.set(result.groups ?? []);
                    this.sections.set(result.sections ?? []);
                    this.applyGuides(groupSlug, sectionSlug, guideId, result.guides ?? []);
                    this.loading.set(false);
                    this.viewStateLoaded.set(true);
                },
                error: () => {
                    if (token !== this.loadToken) {
                        return;
                    }

                    if (!this.viewStateLoaded()) {
                        this.loading.set(false);
                    }
                },
            });
            return;
        }

        forkJoin({
            groups: this.api.getGroups(),
            sections: this.api.getSections(),
        }).subscribe({
            next: (result) => {
                if (token !== this.loadToken) {
                    return;
                }

                this.groups.set(result.groups ?? []);
                this.sections.set(result.sections ?? []);
                this.renderGroupRoute.set(groupSlug);
                this.renderSectionRoute.set('');
                this.renderGuideSlug.set('');
                this.loadCounts(this.filteredSections());
                this.guides.set([]);
                this.openMap.set({});
                this.selectedGuide.set('');
                this.loading.set(false);
                this.viewStateLoaded.set(true);
            },
            error: () => {
                if (token !== this.loadToken) {
                    return;
                }

                if (!this.viewStateLoaded()) {
                    this.loading.set(false);
                }
            },
        });
    }

    private applyGuides(groupSlug: string, sectionSlug: string, guideId: string, guides: Guide[]): void {
        const ordered = [...(guides ?? [])].sort((a, b) => a.number - b.number);
        const collapsed = this.resolveCollapsedGuides(groupSlug, sectionSlug, ordered.map((guide) => guide.id));
        const nextOpen: Record<string, boolean> = Object.fromEntries(
            ordered.map((guide) => [guide.id, !collapsed.includes(guide.id)])
        );

        this.renderGroupRoute.set(groupSlug);
        this.renderSectionRoute.set(sectionSlug);
        this.renderGuideSlug.set(guideId);

        if (guideId) {
            nextOpen[guideId] = true;
        }

        this.guides.set(ordered);
        this.openMap.set(nextOpen);
        this.selectedGuide.set(guideId || ordered[0]?.id || '');
        this.mediaRevision.set(Date.now());
        this.loadCounts(this.filteredSections());

        if (guideId) {
            setTimeout(() => {
                document.getElementById(`guide-${guideId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
        }

        this.notifyContentUpdated();
    }

    toggleGuide(id: string): void {
        this.selectedGuide.set(id);
        this.openMap.update((map) => {
            const next = { ...map, [id]: !map[id] };
            this.persistCollapsedGuides(next);
            return next;
        });
        this.notifyContentUpdated();
    }

    focusGuide(id: string): void {
        this.selectedGuide.set(id);
        this.openMap.update((map) => {
            if (map[id]) {
                return map;
            }

            const next = { ...map, [id]: true };
            this.persistCollapsedGuides(next);
            return next;
        });

        setTimeout(() => {
            document.getElementById(`guide-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
    }

    isActiveGuide(id: string): boolean {
        return this.selectedGuide() === id;
    }

    isOpen(id: string): boolean {
        return Boolean(this.openMap()[id]);
    }

    currentMedia(guide: Guide) {
        const media = guide.media ?? {};
        const currentLangMedia = media[this.lang()];
        if (currentLangMedia?.src) {
            return currentLangMedia;
        }

        const fallbackLang = this.lang() === 'ar' ? 'en' : 'ar';
        return media[fallbackLang] ?? null;
    }

    guideDescription(guide: Guide): string {
        const raw = this.lang() === 'ar' ? guide.desc.ar : guide.desc.en;
        return this.normalizeRichText(raw);
    }

    openMediaPopup(media: { type: 'image' | 'video' | 'gif'; src: string }): void {
        this.popupMedia.set({ type: media.type, src: media.src });
    }

    closeMediaPopup(): void {
        this.popupMedia.set(null);
    }

    private loadCounts(sections: Section[]): void {
        const counts: Record<string, number> = {};

        for (const section of sections) {
            this.api.getGuides(section.route).subscribe((guides) => {
                counts[section.route] = guides?.length ?? 0;
                this.counts.set({ ...counts });
            });
        }
    }

    private parseSavedOpen(raw: string | null): string[] {
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw) as unknown;
            return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
        } catch {
            return [];
        }
    }

    private collapsedGuidesStorageKey(groupSlug: string, sectionSlug: string): string {
        return `npms_collapsed_${groupSlug}_${sectionSlug}`;
    }

    private persistCollapsedGuides(nextOpen: Record<string, boolean>): void {
        const key = this.collapsedGuidesStorageKey(this.renderGroupRoute(), this.renderSectionRoute());
        const collapsed = Object.keys(nextOpen).filter((guideId) => !nextOpen[guideId]);
        localStorage.setItem(key, JSON.stringify(collapsed));
        localStorage.removeItem(`npms_open_${this.renderGroupRoute()}_${this.renderSectionRoute()}`);
    }

    private resolveCollapsedGuides(groupSlug: string, sectionSlug: string, allGuideIds: string[]): string[] {
        const key = this.collapsedGuidesStorageKey(groupSlug, sectionSlug);
        const currentRaw = localStorage.getItem(key);
        if (currentRaw !== null) {
            return this.parseSavedOpen(currentRaw);
        }

        const legacyKey = `npms_open_${groupSlug}_${sectionSlug}`;
        const legacyRaw = localStorage.getItem(legacyKey);
        if (legacyRaw === null) {
            return [];
        }

        const legacyOpen = this.parseSavedOpen(legacyRaw);
        const collapsedFromLegacy = allGuideIds.filter((guideId) => !legacyOpen.includes(guideId));
        localStorage.setItem(key, JSON.stringify(collapsedFromLegacy));
        localStorage.removeItem(legacyKey);
        return collapsedFromLegacy;
    }

    private notifyContentUpdated(): void {
        setTimeout(() => window.dispatchEvent(new Event('npms:content-updated')), 0);
    }

    private normalizeRichText(value: string): string {
        return (value || '')
            .replace(/<o:p>\s*<\/o:p>/gi, '')
            .replace(/<span[^>]*>\s*<\/span>/gi, '')
            .replace(/\sbgcolor=(['"]).*?\1/gi, '')
            .replace(/style=(['"])(.*?)\1/gi, (_full, quote: string, styleValue: string) => {
                const cleanedStyle = styleValue
                    .replace(/(^|;)\s*background(?:-color)?\s*:[^;]*/gi, '$1')
                    .replace(/(^|;)\s*mso-[^:;]+\s*:[^;]*/gi, '$1')
                    .replace(/;;+/g, ';')
                    .replace(/^;|;$/g, '')
                    .trim();
                return cleanedStyle ? `style=${quote}${cleanedStyle}${quote}` : '';
            })
            .replace(/&nbsp;/gi, ' ')
            .replace(/\u00a0/g, ' ')
            .trim();
    }

    mediaAssetUrl(media: { src: string }): string {
        return this.api.mediaAssetUrl(media.src, this.mediaRevision());
    }

    setVideoDefaults(video: HTMLVideoElement): void {
        video.defaultPlaybackRate = 2;
        video.playbackRate = 2;
    }

    isVideoMedia(media: { type: string; src: string }): boolean {
        if (media.type === 'video') {
            return true;
        }

        return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(media.src || '');
    }

    videoMimeType(media: { src: string }): string {
        const lower = (media.src || '').toLowerCase();
        if (lower.endsWith('.webm')) {
            return 'video/webm';
        }

        if (lower.endsWith('.mov')) {
            return 'video/quicktime';
        }

        return 'video/mp4';
    }
}
//#endregion Edit By AI