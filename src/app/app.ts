import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { UiStateService } from './services/ui-state.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  //#region Edit By AI
  private readonly ui = inject(UiStateService);
  private readonly router = inject(Router);

  private navSub?: Subscription;
  private scrollTimer?: number;
  private revealObserver?: IntersectionObserver;

  private readonly routeKey = 'npms_last_route';
  private readonly scrollPrefix = 'npms_scroll_';

  readonly lang = this.ui.lang;

  ngOnInit(): void {
    const current = this.normalizePath(this.router.url);
    const last = this.normalizePath(localStorage.getItem(this.routeKey) || '/');

    if (current === '/' && last !== '/') {
      this.router.navigateByUrl(last, { replaceUrl: true });
    }

    this.navSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(() => {
        const url = this.normalizePath(this.router.url);
        localStorage.setItem(this.routeKey, url);
        this.restoreScroll(url);
        this.initReveal();
      });

    window.addEventListener('scroll', this.handleScroll, { passive: true });
    window.addEventListener('npms:content-updated', this.handleContentUpdated as EventListener);

    requestAnimationFrame(() => this.initReveal());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    window.removeEventListener('scroll', this.handleScroll);
    window.removeEventListener('npms:content-updated', this.handleContentUpdated as EventListener);
    if (this.scrollTimer) {
      window.clearTimeout(this.scrollTimer);
    }
    this.revealObserver?.disconnect();
  }

  setLang(lang: 'ar' | 'en'): void {
    this.ui.setLang(lang);
  }

  private readonly handleScroll = (): void => {
    if (this.scrollTimer) {
      window.clearTimeout(this.scrollTimer);
    }

    this.scrollTimer = window.setTimeout(() => {
      const url = this.normalizePath(this.router.url);
      const meta = this.getRouteMeta(url);
      localStorage.setItem(`${this.scrollPrefix}${meta.key}`, String(window.scrollY));
    }, 150);
  };

  private readonly handleContentUpdated = (): void => {
    this.initReveal();
  };

  private restoreScroll(url: string): void {
    const meta = this.getRouteMeta(url);
    if (meta.hasGuide) {
      return;
    }

    const raw = localStorage.getItem(`${this.scrollPrefix}${meta.key}`);
    if (!raw) {
      return;
    }

    const y = Number.parseInt(raw, 10);
    if (Number.isNaN(y)) {
      return;
    }

    requestAnimationFrame(() => window.scrollTo(0, y));
  }

  private initReveal(): void {
    this.revealObserver?.disconnect();

    const items = Array.from(document.querySelectorAll<HTMLElement>('.reveal')).filter(
      (item) => !item.classList.contains('in')
    );

    if (!items.length) {
      return;
    }

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }

          const el = entry.target as HTMLElement;
          el.classList.add('in');
          this.revealObserver?.unobserve(el);
        }
      },
      { threshold: 0.08 }
    );

    for (const item of items) {
      this.revealObserver.observe(item);
    }
  }

  private getRouteMeta(url: string): { key: string; hasGuide: boolean } {
    const clean = this.normalizePath(url).replace(/^\//, '');
    const parts = clean.split('/').filter(Boolean);

    if (!parts.length) {
      return { key: 'home', hasGuide: false };
    }

    if (parts.length === 1) {
      return { key: parts[0], hasGuide: false };
    }

    return { key: parts[0], hasGuide: true };
  }

  private normalizePath(path: string): string {
    const raw = (path || '').trim();
    if (!raw || raw === '#') {
      return '/';
    }

    const noHash = raw.replace(/^#/, '');
    const noQuery = (noHash.split('?')[0] || '/').split('#')[0] || '/';
    const withLeadingSlash = noQuery.startsWith('/') ? noQuery : `/${noQuery}`;
    const compact = withLeadingSlash.replace(/\/{2,}/g, '/');
    return compact.replace(/\/+$/, '') || '/';
  }
  //#endregion Edit By AI
}
