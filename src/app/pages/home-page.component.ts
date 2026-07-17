import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Group, Section } from '../models';
import { DocsApiService } from '../services/docs-api.service';
import { UiStateService } from '../services/ui-state.service';

//#region Edit By AI
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section
      class="hero hero-home"
      [class.hero-home-dense]="isDenseHome()"
      [class.hero-home-ultra]="isUltraDenseHome()"
    >
      <div class="hero-card">
        <h1>{{ t().heroTitle }}</h1>
        <p>{{ t().heroDesc }}</p>
        <div class="hero-stats">
          <div class="stat"><b>{{ orderedGroups().length }}</b>{{ t().statsSections }}</div>
          <div class="stat"><b>{{ totalSections() }}</b>{{ t().statsGuides }}</div>
        </div>
      </div>
    </section>

    <section
      class="grid-wrap"
      [class.grid-wrap-dense]="isDenseHome()"
      [class.grid-wrap-ultra]="isUltraDenseHome()"
      *ngIf="!loading(); else loadingTpl"
    >
      <div class="grid-title">{{ t().groupsTitle }}</div>

      <div
        class="groups-grid"
        *ngIf="pagedGroups().length; else emptyTpl"
      >
        <a
          class="group-card"
          *ngFor="let group of pagedGroups()"
          [routerLink]="'/' + group.route"
        >
          <div class="group-card-sheen"></div>
          <span class="group-card-title">
            <span class="group-card-icon">{{ group.icon || '📂' }}</span>
            <span>{{ lang() === 'ar' ? group.title.ar : group.title.en }}</span>
          </span>
          <span class="group-card-count">{{ formatSectionsCount(counts()[group.route] || 0) }}</span>
        </a>
      </div>

      <div class="pager" *ngIf="totalPages() > 1">
        <button type="button" class="pager-btn" (click)="goToPage(page() - 1)" [disabled]="page() === 1">{{ t().prev }}</button>
        <span class="pager-status">{{ page() }} / {{ totalPages() }}</span>
        <button type="button" class="pager-btn" (click)="goToPage(page() + 1)" [disabled]="page() === totalPages()">{{ t().next }}</button>
      </div>
    </section>

    <ng-template #emptyTpl>
      <div class="empty-state">
        <div class="emoji">🗂️</div>
        <div>{{ t().noGroups }}</div>
        <div style="font-size:12.5px;margin-top:6px;opacity:.7">{{ t().noGroupsSub }}</div>
      </div>
    </ng-template>

    <ng-template #loadingTpl>
      <section class="grid-wrap">
        <div class="grid-title skeleton skeleton-text skeleton-title"></div>
        <div class="groups-grid">
          <div class="group-card skeleton-card" *ngFor="let item of skeletonItems()"></div>
        </div>
      </section>
    </ng-template>
  `,
})
export class HomePageComponent implements OnInit {
  private readonly api = inject(DocsApiService);
  private readonly ui = inject(UiStateService);

  readonly lang = this.ui.lang;
  readonly loading = signal(true);
  readonly groups = signal<Group[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly page = signal(1);
  readonly pageSize = 10;
  readonly counts = signal<Record<string, number>>({});
  readonly totalSections = signal(0);
  readonly orderedGroups = computed(() => [...this.groups()].sort((a, b) => a.order - b.order));
  readonly pagedGroups = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.orderedGroups().slice(start, start + this.pageSize);
  });
  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.orderedGroups().length / this.pageSize)));
  readonly isDenseHome = computed(() => this.orderedGroups().length >= 10);
  readonly isUltraDenseHome = computed(() => this.orderedGroups().length >= 20);
  readonly skeletonItems = signal(Array.from({ length: 10 }));

  readonly t = computed(() => {
    if (this.lang() === 'ar') {
      return {
        heroTitle: 'مرحبًا بك في مركز توثيق Nexus PMS',
        heroDesc: 'دليلك الشامل لاستخدام النظام خطوة بخطوة — اختر القسم الذي تريد التعرف عليه.',
        statsSections: 'مجموعة',
        statsGuides: 'قسم',
        groupsTitle: 'المجموعات المتاحة',
        sectionsCountSuffix: 'قسم',
        noGroups: 'لا توجد مجموعات مضافة بعد',
        noGroupsSub: 'قم بإضافة المجموعات من لوحة التحكم',
        prev: 'السابق',
        next: 'التالي',
      };
    }

    return {
      heroTitle: 'Welcome to Nexus PMS Documentation Hub',
      heroDesc: 'Your complete step-by-step guide to using the system — choose a section to get started.',
      statsSections: 'Groups',
      statsGuides: 'Sections',
      groupsTitle: 'Available Groups',
      sectionsCountSuffix: 'sections',
      noGroups: 'No groups added yet',
      noGroupsSub: 'Add groups from the admin panel',
      prev: 'Previous',
      next: 'Next',
    };
  });

  ngOnInit(): void {
    this.api.getGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups ?? []);
        this.api.getSections().subscribe((sections) => {
          this.sections.set(sections ?? []);
          this.loadCounts(sections ?? []);
          this.totalSections.set((sections ?? []).length);
          this.loading.set(false);
        });
      },
      error: () => this.loading.set(false),
    });
  }

  goToPage(page: number): void {
    const nextPage = Math.min(this.totalPages(), Math.max(1, page));
    this.page.set(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  formatSectionsCount(count: number): string {
    if (this.lang() === 'ar') {
      return `${count} ${this.t().sectionsCountSuffix}`;
    }

    return `${count} ${count === 1 ? 'section' : 'sections'}`;
  }

  private loadCounts(sections: Section[]): void {
    const counts: Record<string, number> = {};

    for (const section of sections) {
      const groupRoute = section.groupRoute || 'ungrouped';
      counts[groupRoute] = (counts[groupRoute] ?? 0) + 1;
    }

    this.counts.set(counts);
  }
}
//#endregion Edit By AI
