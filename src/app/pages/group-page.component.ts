import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Group, Section } from '../models';
import { DocsApiService } from '../services/docs-api.service';
import { UiStateService } from '../services/ui-state.service';

//#region Edit By AI
@Component({
    selector: 'app-group-page',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
    <section *ngIf="!loading(); else loadingTpl">
      <ng-container *ngIf="group() as currentGroup; else notFoundTpl">
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

          <div class="sections-grid" *ngIf="pagedSections().length; else emptyTpl">
            <a class="section-card reveal" *ngFor="let section of pagedSections()" [routerLink]="'/' + currentGroup.route + '/' + section.route">
              <span class="arrow">{{ lang() === 'ar' ? '←' : '→' }}</span>
              <div class="section-card-top">
                <div class="icon">{{ section.icon || '📄' }}</div>
                <div class="section-chip">{{ lang() === 'ar' ? currentGroup.title.ar : currentGroup.title.en }}</div>
              </div>
              <h3>{{ lang() === 'ar' ? section.title.ar : section.title.en }}</h3>
              <span class="count">{{ counts()[section.route] || 0 }} {{ lang() === 'ar' ? 'دليل' : 'guides' }}</span>
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

    <ng-template #loadingTpl>
      <section class="grid-wrap">
        <div class="grid-title skeleton skeleton-text skeleton-title"></div>
        <div class="sections-grid">
          <div class="section-card skeleton-card" *ngFor="let item of skeletonItems()"></div>
        </div>
      </section>
    </ng-template>

    <ng-template #emptyTpl>
      <div class="empty-state">
        <div class="emoji">📂</div>
        <div>{{ lang() === 'ar' ? 'لا توجد أقسام داخل هذه المجموعة' : 'No sections in this group yet' }}</div>
      </div>
    </ng-template>

    <ng-template #notFoundTpl>
      <div class="empty-state">
        <div class="emoji">📂</div>
        <div>{{ lang() === 'ar' ? 'المجموعة غير موجودة' : 'Group not found' }}</div>
      </div>
    </ng-template>
  `,
})
export class GroupPageComponent implements OnInit {
    private readonly api = inject(DocsApiService);
    private readonly route = inject(ActivatedRoute);
    private readonly ui = inject(UiStateService);

    readonly lang = this.ui.lang;
    readonly loading = signal(true);
    readonly routeSlug = signal('');
    readonly page = signal(1);
    readonly pageSize = 10;
    readonly groups = signal<Group[]>([]);
    readonly sections = signal<Section[]>([]);
    readonly counts = signal<Record<string, number>>({});
    readonly skeletonItems = signal(Array.from({ length: 10 }));

    readonly group = computed(() => this.groups().find((entry) => entry.route === this.routeSlug()) ?? null);
    readonly filteredSections = computed(() => this.sections().filter((section) => section.groupRoute === this.routeSlug()).sort((a, b) => a.order - b.order));
    readonly pagedSections = computed(() => {
        const start = (this.page() - 1) * this.pageSize;
        return this.filteredSections().slice(start, start + this.pageSize);
    });
    readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filteredSections().length / this.pageSize)));

    ngOnInit(): void {
        this.route.paramMap.subscribe((params) => {
            this.routeSlug.set(params.get('groupRoute') ?? '');
            this.page.set(1);
            this.load();
        });
    }

    goToPage(page: number): void {
        this.page.set(Math.min(this.totalPages(), Math.max(1, page)));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    private load(): void {
        this.loading.set(true);
        this.api.getGroups().subscribe((groups) => {
            this.groups.set(groups ?? []);
            this.api.getSections().subscribe((sections) => {
                this.sections.set(sections ?? []);
                this.loadCounts(this.filteredSections());
                this.loading.set(false);
            });
        });
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
}
//#endregion Edit By AI