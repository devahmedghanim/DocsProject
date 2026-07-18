import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Group, Guide, Section } from '../models';
import { DocsApiService } from '../services/docs-api.service';
import { UiStateService } from '../services/ui-state.service';

//#region Edit By AI
@Component({
  selector: 'app-section-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section *ngIf="!loading(); else loadingTpl">
    <section *ngIf="section() as currentSection; else notFound">
      <nav class="breadcrumb" [class.breadcrumb-full]="isWideSection()">
        <a routerLink="/">{{ lang() === 'ar' ? 'الرئيسية' : 'Home' }}</a>
        <span class="sep">/</span>
        <a *ngIf="group() as currentGroup" [routerLink]="'/' + currentGroup.route">{{ lang() === 'ar' ? currentGroup.title.ar : currentGroup.title.en }}</a>
        <span *ngIf="group() as currentGroup" class="sep">/</span>
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
                      controlsList="nodownload noremoteplayback"
                      disablePictureInPicture
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
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            playsinline
            (loadedmetadata)="setVideoDefaults(previewVideo)"
          ></video>
        </div>
      </div>

    </section>

    </section>

    <ng-template #loadingTpl>
      <section class="grid-wrap section-page-loading">
        <div class="hero-card skeleton-card skeleton-hero"></div>
        <div class="section-layout">
          <div class="guides-main">
            <div class="guide-card skeleton-card" *ngFor="let item of skeletonItems()"></div>
          </div>
          <aside class="guide-list-panel skeleton-card"></aside>
        </div>
      </section>
    </ng-template>

    <ng-template #notFound>
      <div class="loading">{{ lang() === 'ar' ? 'القسم غير موجود.' : 'Section not found.' }}</div>
    </ng-template>
  `,
})
export class SectionPageComponent implements OnInit {
  private readonly api = inject(DocsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly ui = inject(UiStateService);

  readonly lang = this.ui.lang;
  readonly loading = signal(true);
  readonly groupRoute = signal('');
  readonly sectionRoute = signal('');
  readonly guideSlug = signal('');
  readonly selectedGuide = signal('');
  readonly popupMedia = signal<{ type: 'image' | 'video' | 'gif'; src: string } | null>(null);
  readonly mediaRevision = signal(Date.now());
  readonly groups = signal<Group[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly guides = signal<Guide[]>([]);
  readonly openMap = signal<Record<string, boolean>>({});
  readonly skeletonItems = signal(Array.from({ length: 4 }));

  readonly group = computed(() => this.groups().find((entry) => entry.route === this.groupRoute()) ?? null);
  readonly section = computed(() => this.sections().find((s) => s.route === this.sectionRoute() && s.groupRoute === this.groupRoute()) ?? null);
  readonly sortedGuides = computed(() => [...this.guides()].sort((a, b) => a.number - b.number));
  readonly isWideSection = computed(() => this.sectionRoute() === 'work-orders');
  readonly orderedSections = computed(() => [...this.sections()].filter((section) => section.groupRoute === this.groupRoute()).sort((a, b) => a.order - b.order));
  readonly currentSectionIndex = computed(() => this.orderedSections().findIndex((s) => s.route === this.sectionRoute()));
  readonly prevSection = computed(() => {
    const index = this.currentSectionIndex();
    return index > 0 ? this.orderedSections()[index - 1] : null;
  });
  readonly nextSection = computed(() => {
    const index = this.currentSectionIndex();
    return index >= 0 && index < this.orderedSections().length - 1 ? this.orderedSections()[index + 1] : null;
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const groupSlug = params.get('groupRoute') ?? '';
      const slug = params.get('sectionRoute') ?? '';
      const guideId = params.get('guideId') ?? '';
      this.groupRoute.set(groupSlug);
      this.sectionRoute.set(slug);
      this.guideSlug.set(guideId);
      this.load(groupSlug, slug, guideId);
    });
  }

  load(groupSlug: string, slug: string, guideId: string): void {
    const cachedGroups = this.api.peekGroups();
    const cachedSections = this.api.peekSections();
    const cachedGuides = this.api.peekGuides(slug);

    if (cachedGroups.length) {
      this.groups.set(cachedGroups);
    }

    if (cachedSections.length) {
      this.sections.set(cachedSections);
    }

    if (cachedGuides.length) {
      const ordered = [...cachedGuides].sort((a, b) => a.number - b.number);
      const storageKey = this.collapsedGuidesStorageKey(groupSlug, slug);
      const collapsed = this.resolveCollapsedGuides(groupSlug, slug, ordered.map((guide) => guide.id));
      const nextOpen: Record<string, boolean> = Object.fromEntries(
        ordered.map((guide) => [guide.id, !collapsed.includes(guide.id)])
      );

      if (guideId) {
        nextOpen[guideId] = true;
      }

      this.guides.set(ordered);
      this.openMap.set(nextOpen);
      this.selectedGuide.set(guideId || ordered[0]?.id || '');
      this.mediaRevision.set(Date.now());
      this.loading.set(false);
      this.notifyContentUpdated();
    } else {
      this.loading.set(true);
    }

    this.api.getGuides(slug).subscribe({
      next: (guides) => {
        const ordered = [...(guides ?? [])].sort((a, b) => a.number - b.number);
        const storageKey = this.collapsedGuidesStorageKey(groupSlug, slug);
        const collapsed = this.resolveCollapsedGuides(groupSlug, slug, ordered.map((guide) => guide.id));
        const nextOpen: Record<string, boolean> = Object.fromEntries(
          ordered.map((guide) => [guide.id, !collapsed.includes(guide.id)])
        );

        if (guideId) {
          nextOpen[guideId] = true;
        }

        this.guides.set(ordered);
        this.openMap.set(nextOpen);
        this.selectedGuide.set(guideId || ordered[0]?.id || '');
        this.mediaRevision.set(Date.now());
        this.loading.set(false);
        this.notifyContentUpdated();

        if (guideId) {
          setTimeout(() => {
            document.getElementById(`guide-${guideId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        }
      },
      error: () => {
        this.guides.set([]);
        this.openMap.set({});
        this.loading.set(false);
      },
    });
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
    this.popupMedia.set({
      type: media.type,
      src: media.src,
    });
  }

  closeMediaPopup(): void {
    this.popupMedia.set(null);
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
    const key = this.collapsedGuidesStorageKey(this.groupRoute(), this.sectionRoute());
    const collapsed = Object.keys(nextOpen).filter((guideId) => !nextOpen[guideId]);
    localStorage.setItem(key, JSON.stringify(collapsed));
    localStorage.removeItem(`npms_open_${this.groupRoute()}_${this.sectionRoute()}`);
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
