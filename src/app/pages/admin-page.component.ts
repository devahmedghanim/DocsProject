import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillModule } from 'ngx-quill';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { firstValueFrom } from 'rxjs';
import { Group, Guide, Section } from '../models';
import { AdminAuthService } from '../services/admin-auth.service';
import { DocsApiService } from '../services/docs-api.service';
import { UiStateService } from '../services/ui-state.service';



//#region Edit By AI
@Component({
  selector: 'app-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuillModule, CdkDropList, CdkDrag, CdkDragHandle],
  template: `
    <section *ngIf="!authChecked()" class="login-shell">
      <div class="login-card">
        <div class="login-badge">⏳</div>
        <h1>{{ tr('جاري التحقق من الجلسة...', 'Checking session...') }}</h1>
      </div>
    </section>

    <section *ngIf="authChecked() && !authenticated(); else adminShell" class="login-shell">
      <div class="login-card">
        <div class="login-badge">🔐</div>
        <h1>{{ tr('تسجيل الدخول إلى لوحة التحكم', 'Admin Login') }}</h1>
        <p>{{ tr('إدارة الأقسام والأدلة والوسائط الخاصة بالتوثيق الداخلي.', 'Manage sections, guides, and media for internal documentation.') }}</p>

        <div class="login-alert" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <form (ngSubmit)="login()" class="login-form">
          <label>{{ tr('اسم المستخدم', 'Username') }}</label>
          <input [(ngModel)]="username" name="username" required />

          <label>{{ tr('كلمة المرور', 'Password') }}</label>
          <input [(ngModel)]="password" name="password" type="password" required />

          <button type="submit" class="btn-primary login-submit" [disabled]="submitting()">{{ tr('دخول', 'Sign In') }}</button>
        </form>
      </div>
    </section>

    <ng-template #adminShell>
      <div class="admin-page-actions">
        <a routerLink="/" class="btn-ghost">{{ tr('🌐 عرض الموقع', '🌐 View Site') }}</a>
        <button type="button" class="btn-ghost" (click)="logout()">{{ tr('تسجيل الخروج', 'Logout') }}</button>
      </div>

      <section class="admin-wrap">
        <div class="admin-panel">
          <div class="panel-head">
            <h2>{{ tr('المجموعات', 'Groups') }}</h2>
            <div class="admin-actions">
              <button class="btn-primary" type="button" (click)="newGroup()">{{ tr('+ إضافة مجموعة', '+ Add Group') }}</button>
            </div>
          </div>
          <div class="admin-list" cdkDropList [cdkDropListData]="orderedGroups()" (cdkDropListDropped)="dropGroup($event)">
            <div
              class="admin-item"
              [class.active]="selectedGroup()?.route === group.route"
              [class.dragging]="draggingGroups()"
              *ngFor="let group of orderedGroups()"
              cdkDrag
              [cdkDragData]="group"
              (cdkDragStarted)="draggingGroups.set(true)"
              (cdkDragEnded)="draggingGroups.set(false)"
              (click)="selectGroup(group)"
            >
              <div class="badge-num">{{ group.icon || '📂' }}</div>
              <div class="info">
                <b>{{ lang() === 'ar' ? group.title.ar : group.title.en }}</b>
                <span class="route-tag">/{{ group.route }}</span>
              </div>
              <button
                type="button"
                class="drag-handle drag-handle-icon"
                cdkDragHandle
                (click)="$event.stopPropagation()"
                [attr.title]="tr('اسحب لترتيب الكارت', 'Drag to reorder card')"
                aria-label="Drag"
              >
                ⋮⋮
              </button>
              <div class="admin-item-actions">
                <button type="button" class="btn-secondary" (click)="startEditGroup(group); $event.stopPropagation()">{{ tr('تعديل', 'Edit') }}</button>
                <button type="button" class="btn-danger" (click)="askDeleteGroup(group); $event.stopPropagation()">{{ tr('حذف', 'Delete') }}</button>
              </div>
            </div>
          </div>
        </div>

        <div class="admin-panel">
          <div class="panel-head">
            <h2>{{ tr('الأقسام', 'Sections') }}</h2>
            <div class="admin-actions">
              <button class="btn-primary" type="button" (click)="newSection()" [disabled]="!selectedGroup()">{{ tr('+ إضافة قسم', '+ Add Section') }}</button>
            </div>
          </div>
          <div class="admin-list" *ngIf="selectedGroup(); else noGroupHint" cdkDropList [cdkDropListData]="orderedSections()" (cdkDropListDropped)="dropSection($event)">
            <div
              class="admin-item"
              [class.active]="selectedSection()?.route === section.route"
              [class.dragging]="draggingSections()"
              *ngFor="let section of orderedSections()"
              cdkDrag
              [cdkDragData]="section"
              (cdkDragStarted)="draggingSections.set(true)"
              (cdkDragEnded)="draggingSections.set(false)"
              (click)="selectSection(section)"
            >
              <div class="badge-num">{{ section.icon || '📄' }}</div>
              <div class="info">
                <b>{{ lang() === 'ar' ? section.title.ar : section.title.en }}</b>
                <span class="route-tag">/{{ section.route }}</span>
              </div>
              <button
                type="button"
                class="drag-handle drag-handle-icon"
                cdkDragHandle
                (click)="$event.stopPropagation()"
                [attr.title]="tr('اسحب لترتيب الكارت', 'Drag to reorder card')"
                aria-label="Drag"
              >
                ⋮⋮
              </button>
              <div class="admin-item-actions">
                <button type="button" class="btn-secondary" (click)="startEditSection(section); $event.stopPropagation()">
                  {{ tr('تعديل', 'Edit') }}
                </button>
                <button type="button" class="btn-danger" (click)="askDeleteSection(section); $event.stopPropagation()">
                  {{ tr('حذف', 'Delete') }}
                </button>
              </div>
            </div>
          </div>
          <ng-template #noGroupHint>
            <div class="empty-hint">{{ tr('اختر مجموعة أولاً لعرض الأقسام التابعة لها', 'Choose a group first to view its sections') }}</div>
          </ng-template>
        </div>

        <div class="admin-panel">
          <div class="panel-head">
            <h2 *ngIf="selectedSection(); else chooseSection">{{ tr('أدلة', 'Guides') }} {{ lang() === 'ar' ? selectedSection()?.title?.ar : selectedSection()?.title?.en }}</h2>
            <ng-template #chooseSection><h2>{{ tr('أدلة القسم', 'Section Guides') }}</h2></ng-template>
            <button class="btn-primary" type="button" (click)="newGuide()" [disabled]="!selectedSection()">
              {{ tr('+ إضافة دليل', '+ Add Guide') }}
            </button>
          </div>

          <div class="admin-list" *ngIf="selectedSection(); else noSectionHint" id="guidesList">
            <div class="admin-item admin-guide-item" *ngFor="let guide of orderedGuides()">
              <div class="badge-num">{{ guide.number.toString().padStart(2, '0') }}</div>
              <div class="info">
                <b>{{ lang() === 'ar' ? guide.title.ar : (guide.title.en || guide.title.ar) }}</b>
              </div>
              <div class="admin-item-actions">
                <button type="button" class="btn-secondary" (click)="editGuide(guide)">{{ tr('تعديل', 'Edit') }}</button>
                <button type="button" class="btn-danger" (click)="askDeleteGuide(guide)">{{ tr('حذف', 'Delete') }}</button>
              </div>
            </div>
          </div>

          <ng-template #noSectionHint>
            <div class="empty-hint" id="noSectionSelected">{{ tr('اختر قسمًا من العمود الأيمن لعرض/إضافة أدلته', 'Choose a section from the right column to view/add its guides') }}</div>
          </ng-template>
        </div>
      </section>

      <div class="modal-overlay show" *ngIf="editingGroup()" (click)="cancelGroupEdit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ groupEditMode() === 'create' ? tr('إضافة مجموعة جديدة', 'Add New Group') : tr('تعديل المجموعة', 'Edit Group') }}</h3>
          <form (ngSubmit)="saveGroup()">
            <label>{{ tr('الأيقونة', 'Icon') }}</label>
            <div class="icon-picker" [class.open]="groupIconMenuOpen()">
              <button type="button" class="icon-picker-trigger" (click)="toggleGroupIconMenu()">
                <span class="icon-picker-current">{{ groupForm.icon }}</span>
                <span class="icon-picker-label">
                  <strong>{{ selectedGroupIconLabel().ar }}</strong>
                  <small>{{ selectedGroupIconLabel().en }}</small>
                </span>
                <span class="icon-picker-caret">▾</span>
              </button>

              <div class="icon-picker-menu" *ngIf="groupIconMenuOpen()">
                <button
                  type="button"
                  class="icon-picker-option"
                  *ngFor="let icon of sectionIconOptions"
                  [class.active]="groupForm.icon === icon.value"
                  (click)="selectGroupIcon(icon.value)"
                >
                  <span class="icon-picker-current">{{ icon.value }}</span>
                  <span class="icon-picker-label">
                    <strong>{{ icon.ar }}</strong>
                    <small>{{ icon.en }}</small>
                  </span>
                </button>
              </div>
            </div>

            <label>{{ tr('Route (بالإنجليزي، بدون مسافات) *', 'Route (English, no spaces) *') }}</label>
            <input type="text" [(ngModel)]="groupForm.route" name="group_route" required pattern="[a-z0-9\-]+" />

            <div class="two-col">
              <div>
                <label>{{ tr('عنوان المجموعة (عربي) *', 'Group Title (Arabic) *') }}</label>
                <input type="text" [(ngModel)]="groupForm.title_ar" name="group_title_ar" required />
              </div>
              <div>
                <label>{{ tr('عنوان المجموعة (إنجليزي) *', 'Group Title (English) *') }}</label>
                <input type="text" [(ngModel)]="groupForm.title_en" name="group_title_en" required />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-ghost" (click)="cancelGroupEdit()">{{ tr('إلغاء', 'Cancel') }}</button>
              <button type="submit" class="btn-primary" [disabled]="savingGroup()">{{ groupEditMode() === 'create' ? tr('حفظ المجموعة', 'Save Group') : tr('حفظ التعديلات', 'Save Changes') }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay show" *ngIf="editingSection()" (click)="cancelSectionEdit()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ sectionEditMode() === 'create' ? tr('إضافة قسم جديد', 'Add New Section') : tr('تعديل القسم', 'Edit Section') }}</h3>
          <form (ngSubmit)="saveSection()">
            <label>{{ tr('المجموعة *', 'Group *') }}</label>
            <select [(ngModel)]="sectionForm.group_route" name="group_route" required>
              <option value="" disabled>{{ tr('اختر مجموعة', 'Choose a group') }}</option>
              <option *ngFor="let group of orderedGroups()" [value]="group.route">{{ lang() === 'ar' ? group.title.ar : group.title.en }}</option>
            </select>

            <label>{{ tr('الأيقونة', 'Icon') }}</label>
            <div class="icon-picker" [class.open]="sectionIconMenuOpen()">
              <button type="button" class="icon-picker-trigger" (click)="toggleSectionIconMenu()">
                <span class="icon-picker-current">{{ sectionForm.icon }}</span>
                <span class="icon-picker-label">
                  <strong>{{ selectedSectionIconLabel().ar }}</strong>
                  <small>{{ selectedSectionIconLabel().en }}</small>
                </span>
                <span class="icon-picker-caret">▾</span>
              </button>

              <div class="icon-picker-menu" *ngIf="sectionIconMenuOpen()">
                <button
                  type="button"
                  class="icon-picker-option"
                  *ngFor="let icon of sectionIconOptions"
                  [class.active]="sectionForm.icon === icon.value"
                  (click)="selectSectionIcon(icon.value)"
                >
                  <span class="icon-picker-current">{{ icon.value }}</span>
                  <span class="icon-picker-label">
                    <strong>{{ icon.ar }}</strong>
                    <small>{{ icon.en }}</small>
                  </span>
                </button>
              </div>
            </div>

            <label>{{ tr('Route (بالإنجليزي، بدون مسافات) *', 'Route (English, no spaces) *') }}</label>
            <input type="text" [(ngModel)]="sectionForm.route" name="route" required pattern="[a-z0-9\-]+" />

            <div class="two-col">
              <div>
                <label>{{ tr('عنوان القسم (عربي) *', 'Section Title (Arabic) *') }}</label>
                <input type="text" [(ngModel)]="sectionForm.title_ar" name="title_ar" required />
              </div>
              <div>
                <label>{{ tr('عنوان القسم (إنجليزي) *', 'Section Title (English) *') }}</label>
                <input type="text" [(ngModel)]="sectionForm.title_en" name="title_en" required />
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-ghost" (click)="cancelSectionEdit()">{{ tr('إلغاء', 'Cancel') }}</button>
              <button type="submit" class="btn-primary" [disabled]="savingSection()">{{ sectionEditMode() === 'create' ? tr('حفظ القسم', 'Save Section') : tr('حفظ التعديلات', 'Save Changes') }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay show" *ngIf="editingGuide()" (click)="cancelGuideEdit()">
        <div class="modal modal-lg" (click)="$event.stopPropagation()">
          <h3>{{ guideEditMode() === 'create' ? tr('إضافة دليل جديد', 'Add New Guide') : tr('تعديل الدليل', 'Edit Guide') }}</h3>
          <form (ngSubmit)="saveGuide()">
            <label>{{ tr('رقم الدليل *', 'Guide Number *') }}</label>
            <input [(ngModel)]="guideForm.number" name="number" type="number" min="1" required />

            <div class="lang-tabs">
              <button type="button" class="lang-tab" [class.active]="guideLangTab() === 'ar'" (click)="setGuideLangTab('ar')">
                {{ tr('المحتوى العربي', 'Arabic Content') }}
              </button>
              <button type="button" class="lang-tab" [class.active]="guideLangTab() === 'en'" (click)="setGuideLangTab('en')">
                {{ tr('المحتوى الإنجليزي', 'English Content') }}
              </button>
            </div>

            <div class="lang-panel" [style.display]="guideLangTab() === 'ar' ? 'block' : 'none'">
              <label>{{ tr('عنوان الدليل (عربي) *', 'Guide Title (Arabic) *') }}</label>
              <input type="text" [(ngModel)]="guideForm.title_ar" name="title_ar" required />

              <label>{{ tr('شرح الدليل (عربي) *', 'Guide Description (Arabic) *') }}</label>
              <quill-editor
                class="guide-editor guide-editor-ar"
                [(ngModel)]="guideForm.desc_ar"
                [modules]="quillModules"
                [styles]="{ height: '320px' }"
                format="html"
                name="desc_ar"
              ></quill-editor>
              
              <div class="form-note">{{ tr('يمكنك تنسيق النص، عمل نقاط، تلوين كلمات، أو لصق محتوى من Word مباشرة.', 'You can format text, add lists, color words, or paste content from Word directly.') }}</div>

              <div class="two-col">
                <div>
                  <label>{{ tr('نوع الوسيط (عربي)', 'Media Type (Arabic)') }}</label>
                  <input type="text" [value]="guideForm.media_type_ar" readonly />
                </div>
                <div>
                  <label>{{ tr('مسار الوسيط (عربي)', 'Media Path (Arabic)') }}</label>
                  <input type="text" [(ngModel)]="guideForm.media_src_ar" name="media_src_ar" placeholder="uploads/work-orders/1/ar/image.jpg" />
                </div>
              </div>

              <label>{{ tr('ملف الوسائط (عربي) — صورة / فيديو / GIF', 'Media File (Arabic) — image / video / GIF') }}</label>
              <input type="file" accept="image/*,video/*" (change)="onMediaFileChange('ar', $event)" />
              <div class="form-note">{{ tr('اترك الملف فارغًا للاحتفاظ بالوسائط الحالية.', 'Leave file empty to keep existing media.') }}</div>
            </div>

            <div class="lang-panel" [style.display]="guideLangTab() === 'en' ? 'block' : 'none'">
              <label>{{ tr('عنوان الدليل (إنجليزي)', 'Guide Title (English)') }}</label>
              <input type="text" [(ngModel)]="guideForm.title_en" name="title_en" />

              <label>{{ tr('شرح الدليل (إنجليزي)', 'Guide Description (English)') }}</label>
              <quill-editor
                class="guide-editor guide-editor-en"
                [(ngModel)]="guideForm.desc_en"
                [modules]="quillModules"
                [styles]="{ height: '320px' }"
                format="html"
                name="desc_en"
              ></quill-editor>

              <div class="two-col">
                <div>
                  <label>{{ tr('نوع الوسيط (إنجليزي)', 'Media Type (English)') }}</label>
                  <input type="text" [value]="guideForm.media_type_en" readonly />
                </div>
                <div>
                  <label>{{ tr('مسار الوسيط (إنجليزي)', 'Media Path (English)') }}</label>
                  <input type="text" [(ngModel)]="guideForm.media_src_en" name="media_src_en" placeholder="uploads/work-orders/1/en/image.jpg" />
                </div>
              </div>

              <label>{{ tr('ملف الوسائط (إنجليزي) — صورة / فيديو / GIF', 'Media File (English) — image / video / GIF') }}</label>
              <input type="file" accept="image/*,video/*" (change)="onMediaFileChange('en', $event)" />
              <div class="form-note">{{ tr('اترك الملف فارغًا للاحتفاظ بالوسائط الحالية.', 'Leave file empty to keep existing media.') }}</div>
            </div>

            <div class="upload-progress" *ngIf="uploading()">
              <div class="bar"><div class="fill" [style.width.%]="uploadPercent()"></div></div>
              <span>{{ uploadPercent() }}%</span>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-ghost" (click)="cancelGuideEdit()">{{ tr('إلغاء', 'Cancel') }}</button>
              <button type="submit" class="btn-primary" [disabled]="uploading() || savingGuide()">{{ guideEditMode() === 'create' ? tr('حفظ الدليل', 'Save Guide') : tr('حفظ التعديلات', 'Save Changes') }}</button>
            </div>
          </form>
        </div>
      </div>

      <div class="modal-overlay show" *ngIf="deletingGroup()" (click)="cancelDeleteGroup()">
        <div class="modal modal-confirm" (click)="$event.stopPropagation()">
          <h3>{{ tr('تأكيد حذف المجموعة', 'Confirm Group Deletion') }}</h3>
          <p>
            {{ tr('هل تريد حذف المجموعة', 'Do you want to permanently delete group') }}
            <strong>{{ deletingGroup()?.title?.ar || deletingGroup()?.title?.en || '' }}</strong>
            {{ tr('نهائيًا؟ سيتم حذف الأقسام والدلائل التابعة لها.', '? Related sections, guides, and media will be deleted.') }}
          </p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="cancelDeleteGroup()">{{ tr('إلغاء', 'Cancel') }}</button>
            <button type="button" class="btn-danger" (click)="confirmDeleteGroup()">{{ tr('حذف', 'Delete') }}</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay show" *ngIf="deletingGuide()" (click)="cancelDeleteGuide()">
        <div class="modal modal-confirm" (click)="$event.stopPropagation()">
          <h3>{{ tr('تأكيد حذف الدليل', 'Confirm Guide Deletion') }}</h3>
          <p>
            {{ tr('هل تريد حذف الدليل', 'Do you want to permanently delete guide') }}
            <strong>{{ deletingGuide()?.title?.ar || deletingGuide()?.title?.en || '' }}</strong>
            {{ tr('نهائيًا؟', '?') }}
          </p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="cancelDeleteGuide()">{{ tr('إلغاء', 'Cancel') }}</button>
            <button type="button" class="btn-danger" (click)="confirmDeleteGuide()">{{ tr('حذف', 'Delete') }}</button>
          </div>
        </div>
      </div>

      <div class="modal-overlay show" *ngIf="deletingSection()" (click)="cancelDeleteSection()">
        <div class="modal modal-confirm" (click)="$event.stopPropagation()">
          <h3>{{ tr('تأكيد حذف القسم', 'Confirm Section Deletion') }}</h3>
          <p>
            {{ tr('هل تريد حذف القسم', 'Do you want to permanently delete section') }}
            <strong>{{ deletingSection()?.title?.ar || deletingSection()?.title?.en || '' }}</strong>
            {{ tr('نهائيًا؟ سيتم حذف الأدلة والوسائط التابعة له.', '? Related guides and media will be deleted.') }}
          </p>
          <div class="modal-actions">
            <button type="button" class="btn-ghost" (click)="cancelDeleteSection()">{{ tr('إلغاء', 'Cancel') }}</button>
            <button type="button" class="btn-danger" (click)="confirmDeleteSection()">{{ tr('حذف', 'Delete') }}</button>
          </div>
        </div>
      </div>
    </ng-template>
  `,
})
export class AdminPageComponent implements OnInit {
  private readonly auth = inject(AdminAuthService);
  private readonly api = inject(DocsApiService);
  private readonly ui = inject(UiStateService);
  private readonly selectedSectionKey = 'npms_admin_selected_section';

  readonly authenticated = signal(false);
  readonly authChecked = signal(false);
  readonly submitting = signal(false);
  readonly errorMessage = signal('');

  readonly groups = signal<Group[]>([]);
  readonly sections = signal<Section[]>([]);
  readonly guides = signal<Guide[]>([]);
  readonly selectedGroup = signal<Group | null>(null);
  readonly selectedSection = signal<Section | null>(null);

  readonly editingGroup = signal(false);
  readonly groupEditMode = signal<'create' | 'edit'>('create');
  readonly groupEditingOriginalRoute = signal('');
  readonly groupIconMenuOpen = signal(false);
  readonly editingSection = signal(false);
  readonly sectionEditMode = signal<'create' | 'edit'>('create');
  readonly sectionEditingOriginalRoute = signal('');
  readonly sectionIconMenuOpen = signal(false);

  readonly editingGuide = signal(false);
  readonly guideEditMode = signal<'create' | 'edit'>('create');
  readonly guideEditingId = signal('');
  readonly guideLangTab = signal<'ar' | 'en'>('ar');
  readonly deletingGuide = signal<Guide | null>(null);
  readonly deletingSection = signal<Section | null>(null);
  readonly deletingGroup = signal<Group | null>(null);
  readonly uploading = signal(false);
  readonly uploadPercent = signal(0);
  readonly lang = this.ui.lang;
  readonly savingGroup = signal(false);
  readonly savingSection = signal(false);
  readonly savingGuide = signal(false);
  readonly reorderingGroups = signal(false);
  readonly reorderingSections = signal(false);
  readonly draggingGroups = signal(false);
  readonly draggingSections = signal(false);

  readonly quillModules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      [{ font: [] }],
      [{ size: ['small', false, 'large', 'huge'] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }, { background: [] }],
      [{ script: 'sub' }, { script: 'super' }],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ direction: 'rtl' }, { align: [] }],
      ['link', 'image', 'video'],
      ['clean'],
    ],
    clipboard: {
      matchVisual: false,
    },
  };

  readonly orderedGroups = computed(() => [...this.groups()].sort((a, b) => a.order - b.order));
  readonly orderedSections = computed(() => [...this.sections()].filter((section) => !this.selectedGroup() || section.groupRoute === this.selectedGroup()?.route).sort((a, b) => a.order - b.order));
  readonly orderedGuides = computed(() => [...this.guides()].sort((a, b) => a.number - b.number));

  username = '';
  password = '';

  groupForm = {
    icon: '📂',
    route: '',
    title_ar: '',
    title_en: '',
    desc_ar: '',
    desc_en: '',
  };

  sectionForm = {
    group_route: '',
    route: '',
    icon: '📄',
    title_ar: '',
    title_en: '',
    desc_ar: '',
    desc_en: '',
  };

  guideForm = {
    number: 1,
    title_ar: '',
    title_en: '',
    desc_ar: '',
    desc_en: '',
    media_type_ar: 'image' as 'image' | 'video' | 'gif',
    media_src_ar: '',
    media_type_en: 'image' as 'image' | 'video' | 'gif',
    media_src_en: '',
  };

  readonly sectionIconOptions = [
    { value: '🏢', ar: 'شركة', en: 'Company' },
    { value: '🏛️', ar: 'مقر الشركة', en: 'HQ' },
    { value: '🏬', ar: 'قطاع الشركة', en: 'Business Unit' },
    { value: '🧱', ar: 'إدارة المشاريع', en: 'Projects Department' },
    { value: '🧾', ar: 'الإدارة المالية', en: 'Finance Department' },
    { value: '🧑‍💼', ar: 'الموارد البشرية', en: 'HR Department' },
    { value: '📣', ar: 'التسويق', en: 'Marketing Department' },
    { value: '🛰️', ar: 'مشاريع الاتصالات', en: 'Telecom Projects' },
    { value: '🛡️', ar: 'الامتثال والجودة', en: 'Compliance & Quality' },
    { value: '🏗️', ar: 'إدارة الأصول', en: 'Assets Management' },
    { value: '🏭', ar: 'الأصول الصناعية', en: 'Industrial Assets' },
    { value: '🚜', ar: 'أصول المعدات', en: 'Equipment Assets' },
    { value: '🚘', ar: 'الأسطول', en: 'Fleet' },
    { value: '🚐', ar: 'أسطول النقل', en: 'Transport Fleet' },
    { value: '🛞', ar: 'المركبات', en: 'Vehicles' },
    { value: '🛠️', ar: 'الورش', en: 'Workshops' },
    { value: '🔩', ar: 'الصيانة الفنية', en: 'Technical Maintenance' },
    { value: '🧰', ar: 'عدة الورش', en: 'Workshop Tools' },
    { value: '📄', ar: 'مستند', en: 'Document' },
    { value: '🧾', ar: 'فاتورة', en: 'Invoice' },
    { value: '🛠️', ar: 'صيانة', en: 'Maintenance' },
    { value: '🔧', ar: 'أدوات', en: 'Tools' },
    { value: '🧱', ar: 'بناء', en: 'Build' },
    { value: '🏗️', ar: 'إنشاء', en: 'Construction' },
    { value: '📐', ar: 'تصميم', en: 'Design' },
    { value: '🏭', ar: 'مصنع', en: 'Factory' },
    { value: '📦', ar: 'حزمة', en: 'Package' },
    { value: '🏷️', ar: 'وسم', en: 'Tag' },
    { value: '🚚', ar: 'شحن', en: 'Shipping' },
    { value: '🚛', ar: 'نقل', en: 'Transport' },
    { value: '🗺️', ar: 'خريطة', en: 'Map' },
    { value: '📍', ar: 'موقع', en: 'Location' },
    { value: '🏬', ar: 'فرع', en: 'Branch' },
    { value: '📊', ar: 'إحصاء', en: 'Stats' },
    { value: '📈', ar: 'صعود', en: 'Growth' },
    { value: '📉', ar: 'هبوط', en: 'Decline' },
    { value: '🧮', ar: 'حساب', en: 'Calc' },
    { value: '📋', ar: 'قائمة', en: 'List' },
    { value: '✅', ar: 'اعتماد', en: 'Approval' },
    { value: '🗂️', ar: 'ملفات', en: 'Files' },
    { value: '📚', ar: 'مراجع', en: 'Library' },
    { value: '📝', ar: 'ملاحظات', en: 'Notes' },
    { value: '💰', ar: 'مالية', en: 'Finance' },
    { value: '💳', ar: 'مدفوعات', en: 'Payments' },
    { value: '📃', ar: 'ورقة', en: 'Paper' },
    { value: '🏦', ar: 'بنك', en: 'Bank' },
    { value: '💼', ar: 'أعمال', en: 'Business' },
    { value: '📑', ar: 'تقارير', en: 'Reports' },
    { value: '🛒', ar: 'مشتريات', en: 'Purchases' },
    { value: '🤝', ar: 'اتفاق', en: 'Agreement' },
    { value: '🏪', ar: 'متجر', en: 'Store' },
    { value: '👥', ar: 'فريق', en: 'Team' },
    { value: '👤', ar: 'شخص', en: 'User' },
    { value: '🎓', ar: 'تدريب', en: 'Training' },
    { value: '🕒', ar: 'وقت', en: 'Time' },
    { value: '📅', ar: 'تقويم', en: 'Calendar' },
    { value: '🧑‍💼', ar: 'موظف', en: 'Staff' },
    { value: '🏢', ar: 'مؤسسة', en: 'Organization' },
    { value: '🧰', ar: 'عدة', en: 'Kit' },
    { value: '💻', ar: 'حاسوب', en: 'Computer' },
    { value: '🖥️', ar: 'شاشة', en: 'Screen' },
    { value: '📡', ar: 'شبكة', en: 'Network' },
    { value: '☎️', ar: 'هاتف', en: 'Phone' },
    { value: '🔐', ar: 'أمان', en: 'Security' },
    { value: '🔔', ar: 'تنبيه', en: 'Alert' },
    { value: '⚠️', ar: 'تحذير', en: 'Warning' },
    { value: '🆘', ar: 'مساعدة', en: 'Help' },
    { value: '⚙️', ar: 'إعدادات', en: 'Settings' },
    { value: '🌐', ar: 'عالمي', en: 'Global' },
    { value: '📨', ar: 'رسائل', en: 'Messages' },
    { value: '✉️', ar: 'بريد', en: 'Mail' },
    { value: '📞', ar: 'اتصال', en: 'Contact' },
    { value: '👨‍💻', ar: 'تقني', en: 'Tech' },
    { value: '🧪', ar: 'اختبار', en: 'Test' },
    { value: '🏥', ar: 'خدمة', en: 'Service' },
    { value: '🛡️', ar: 'حماية', en: 'Protection' },
    { value: '🔍', ar: 'بحث', en: 'Search' },
    { value: '📸', ar: 'صور', en: 'Photos' },
    { value: '🎯', ar: 'هدف', en: 'Target' },
    { value: '🚀', ar: 'إطلاق', en: 'Launch' },
    { value: '🏆', ar: 'إنجاز', en: 'Award' },
    { value: '📁', ar: 'مجلد', en: 'Folder' },
    { value: '🗄️', ar: 'أرشيف', en: 'Archive' },
    { value: '🔖', ar: 'مرجع', en: 'Bookmark' },
    { value: '📌', ar: 'تثبيت', en: 'Pin' },
    { value: '🏠', ar: 'رئيسية', en: 'Home' },
    { value: '🌳', ar: 'شجرة', en: 'Tree' },
    { value: '🏫', ar: 'تعليم', en: 'Education' },
    { value: '🧹', ar: 'تنظيف', en: 'Cleaning' },
    { value: '💡', ar: 'فكرة', en: 'Idea' },
    { value: '📂', ar: 'تصنيف', en: 'Category' }
  ];

  private mediaFileAr: File | null = null;
  private mediaFileEn: File | null = null;

  ngOnInit(): void {
    this.authChecked.set(false);
    const hasStoredToken = this.auth.hasToken();

    if (!hasStoredToken) {
      this.authenticated.set(false);
      this.authChecked.set(true);
      return;
    }

    // Keep login hidden while validating a locally stored token.
    this.authenticated.set(true);
    this.auth.checkStatus().subscribe((ok) => {
      this.authenticated.set(ok);
      this.authChecked.set(true);
      if (ok) {
        this.loadGroups();
      }
    });
  }

  login(): void {
    this.submitting.set(true);
    this.errorMessage.set('');

    this.auth.login(this.username, this.password).subscribe({
      next: (res) => {
        this.submitting.set(false);
        if (!res.ok) {
          this.errorMessage.set(res.error ?? this.tr('فشل تسجيل الدخول', 'Login failed'));
          return;
        }
        this.authenticated.set(true);
        this.loadGroups();
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set(this.tr('فشل تسجيل الدخول', 'Login failed'));
      },
    });
  }

  loadSections(): void {
    this.api.getSections().subscribe((sections) => {
      this.sections.set(sections ?? []);
      const selectedRoute = this.selectedSectionRoute();
      const filtered = (sections ?? []).filter((section) => !this.selectedGroup() || section.groupRoute === this.selectedGroup()?.route);
      const fresh = filtered.find((section) => section.route === selectedRoute) ?? (filtered[0] ?? null);

      this.selectedSection.set(fresh);
      if (fresh) {
        this.persistSelectedSectionRoute(fresh.route);
        this.loadGuides(fresh.route);
        return;
      }

      this.guides.set([]);
      this.persistSelectedSectionRoute('');
    });
  }

  loadGroups(): void {
    this.api.getGroups().subscribe((groups) => {
      this.groups.set(groups ?? []);
      const current = this.selectedGroup()?.route;
      const next = (groups ?? []).find((group) => group.route === current) ?? (groups?.[0] ?? null);
      this.selectedGroup.set(next);
      this.loadSections();
    });
  }

  selectGroup(group: Group): void {
    if (this.draggingGroups()) {
      return;
    }

    this.selectedGroup.set(group);
    this.selectedSection.set(null);
    this.guides.set([]);
    this.persistSelectedSectionRoute('');
    this.loadSections();
  }

  async dropGroup(event: CdkDragDrop<Group[]>): Promise<void> {
    if (this.reorderingGroups() || event.previousIndex === event.currentIndex) {
      return;
    }

    const ordered = [...this.orderedGroups()];
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    const reorderedGroups = ordered.map((entry, index) => ({ ...entry, order: index + 1 }));
    const selectedRoute = this.selectedGroup()?.route;

    this.reorderingGroups.set(true);
    this.groups.set(reorderedGroups);

    if (selectedRoute) {
      this.selectedGroup.set(reorderedGroups.find((entry) => entry.route === selectedRoute) ?? null);
    }

    try {
      await firstValueFrom(this.api.reorderGroups(reorderedGroups));
    } catch {
      this.errorMessage.set(this.tr('تعذر تحديث ترتيب المجموعات', 'Unable to reorder groups'));
      this.loadGroups();
    } finally {
      this.reorderingGroups.set(false);
    }
  }

  newGroup(): void {
    this.groupEditMode.set('create');
    this.groupEditingOriginalRoute.set('');
    this.groupIconMenuOpen.set(false);
    this.groupForm = { icon: '📂', route: '', title_ar: '', title_en: '', desc_ar: '', desc_en: '' };
    this.editingGroup.set(true);
  }

  startEditGroup(group: Group): void {
    this.groupEditMode.set('edit');
    this.groupEditingOriginalRoute.set(group.route);
    this.groupIconMenuOpen.set(false);
    this.groupForm = {
      icon: group.icon || '📂',
      route: group.route,
      title_ar: group.title.ar,
      title_en: group.title.en,
      desc_ar: group.desc.ar,
      desc_en: group.desc.en,
    };
    this.editingGroup.set(true);
  }

  saveGroup(): void {
    if (this.savingGroup()) {
      return;
    }

    this.savingGroup.set(true);
    const body = new FormData();
    const nextRoute = this.groupForm.route.trim();
    if (this.groupEditMode() === 'edit') {
      body.set('original_route', this.groupEditingOriginalRoute());
    }
    body.set('icon', this.groupForm.icon || '📂');
    body.set('route', nextRoute);
    body.set('title_ar', this.groupForm.title_ar.trim());
    body.set('title_en', this.groupForm.title_en.trim());
    body.set('desc_ar', '');
    body.set('desc_en', '');

    this.api.saveGroup(body).subscribe({
      next: () => {
        this.savingGroup.set(false);
        this.editingGroup.set(false);
        this.loadGroups();
      },
      error: () => {
        this.savingGroup.set(false);
        this.errorMessage.set(this.tr('تعذر حفظ المجموعة', 'Unable to save group'));
      },
    });
  }

  cancelGroupEdit(): void {
    this.savingGroup.set(false);
    this.groupIconMenuOpen.set(false);
    this.editingGroup.set(false);
  }

  toggleGroupIconMenu(): void {
    this.groupIconMenuOpen.update((value) => !value);
  }

  selectGroupIcon(icon: string): void {
    this.groupForm.icon = icon;
    this.groupIconMenuOpen.set(false);
  }

  selectedGroupIconLabel(): { ar: string; en: string } {
    return this.sectionIconOptions.find((option) => option.value === this.groupForm.icon) ?? this.sectionIconOptions.find((option) => option.value === '📂') ?? this.sectionIconOptions[0];
  }

  selectSection(section: Section): void {
    if (this.draggingSections()) {
      return;
    }

    this.selectedSection.set(section);
    this.persistSelectedSectionRoute(section.route);
    this.loadGuides(section.route);
  }

  async dropSection(event: CdkDragDrop<Section[]>): Promise<void> {
    if (this.reorderingSections() || event.previousIndex === event.currentIndex) {
      return;
    }

    const ordered = [...this.orderedSections()];
    moveItemInArray(ordered, event.previousIndex, event.currentIndex);
    const selectedGroupRoute = this.selectedGroup()?.route ?? '';
    const reorderedSections = ordered.map((entry, index) => ({ ...entry, order: index + 1 }));
    const selectedRoute = this.selectedSection()?.route;
    const reorderedMap = new Map(reorderedSections.map((entry) => [entry.route, entry.order]));

    this.reorderingSections.set(true);
    this.sections.update((all) =>
      all.map((entry) => (entry.groupRoute === selectedGroupRoute && reorderedMap.has(entry.route)
        ? { ...entry, order: reorderedMap.get(entry.route)! }
        : entry))
    );

    if (selectedRoute) {
      this.selectedSection.set(this.sections().find((entry) => entry.route === selectedRoute) ?? null);
    }

    try {
      await firstValueFrom(this.api.reorderSections(reorderedSections));
    } catch {
      this.errorMessage.set(this.tr('تعذر تحديث ترتيب الأقسام', 'Unable to reorder sections'));
      this.loadSections();
    } finally {
      this.reorderingSections.set(false);
    }
  }

  startEditSection(section: Section): void {
    this.sectionEditMode.set('edit');
    this.sectionEditingOriginalRoute.set(section.route);
    this.sectionIconMenuOpen.set(false);
    this.sectionForm = {
      group_route: section.groupRoute,
      route: section.route,
      icon: section.icon || '📄',
      title_ar: section.title.ar,
      title_en: section.title.en,
      desc_ar: section.desc.ar,
      desc_en: section.desc.en,
    };
    this.editingSection.set(true);
  }

  loadGuides(route: string): void {
    this.api.getGuides(route).subscribe((guides) => this.guides.set(guides ?? []));
  }

  newSection(): void {
    this.sectionEditMode.set('create');
    this.sectionEditingOriginalRoute.set('');
    this.sectionIconMenuOpen.set(false);
    this.sectionForm = { group_route: this.selectedGroup()?.route ?? '', route: '', icon: '📄', title_ar: '', title_en: '', desc_ar: '', desc_en: '' };
    this.editingSection.set(true);
  }

  setGuideLangTab(lang: 'ar' | 'en'): void {
    this.guideLangTab.set(lang);
  }

  onMediaFileChange(lang: 'ar' | 'en', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) {
      if (lang === 'ar') {
        this.mediaFileAr = null;
      } else {
        this.mediaFileEn = null;
      }
      return;
    }

    const detectedType = this.detectMediaTypeFromFile(file);
    if (!detectedType) {
      input.value = '';
      alert(this.tr('نوع الملف غير مدعوم. المسموح فقط: صورة أو فيديو أو GIF.', 'Unsupported file type. Allowed: image, video, or GIF.'));
      return;
    }

    if (lang === 'ar') {
      this.mediaFileAr = file;
      this.guideForm.media_type_ar = detectedType;
      return;
    }

    this.mediaFileEn = file;
    this.guideForm.media_type_en = detectedType;
  }

  saveSection(): void {
    if (this.savingSection()) {
      return;
    }

    this.savingSection.set(true);
    const body = new FormData();
    const nextRoute = this.sectionForm.route.trim();
    if (this.sectionEditMode() === 'edit') {
      body.set('original_route', this.sectionEditingOriginalRoute());
    }
    body.set('group_route', this.sectionForm.group_route.trim());
    body.set('route', nextRoute);
    body.set('icon', this.sectionForm.icon || '📄');
    body.set('title_ar', this.sectionForm.title_ar.trim());
    body.set('title_en', this.sectionForm.title_en.trim());
    body.set('desc_ar', '');
    body.set('desc_en', '');

    this.api.saveSection(body).subscribe({
      next: () => {
        this.savingSection.set(false);
        this.editingSection.set(false);
        this.sectionIconMenuOpen.set(false);
        this.persistSelectedSectionRoute(nextRoute);
        this.loadSections();
      },
      error: () => {
        this.savingSection.set(false);
        this.errorMessage.set(this.tr('تعذر حفظ القسم', 'Unable to save section'));
      },
    });
  }

  cancelSectionEdit(): void {
    this.savingSection.set(false);
    this.sectionIconMenuOpen.set(false);
    this.editingSection.set(false);
  }

  toggleSectionIconMenu(): void {
    this.sectionIconMenuOpen.update((value) => !value);
  }

  selectSectionIcon(icon: string): void {
    this.sectionForm.icon = icon;
    this.sectionIconMenuOpen.set(false);
  }

  selectedSectionIconLabel(): { ar: string; en: string } {
    return this.sectionIconOptions.find((option) => option.value === this.sectionForm.icon) ?? this.sectionIconOptions[0];
  }

  newGuide(): void {
    this.guideEditMode.set('create');
    this.guideEditingId.set('');
    this.guideForm = {
      number: this.guides().length + 1,
      title_ar: '',
      title_en: '',
      desc_ar: '',
      desc_en: '',
      media_type_ar: 'image',
      media_src_ar: '',
      media_type_en: 'image',
      media_src_en: '',
    };
    this.guideLangTab.set('ar');
    this.mediaFileAr = null;
    this.mediaFileEn = null;
    this.uploading.set(false);
    this.uploadPercent.set(0);
    this.editingGuide.set(true);
  }

  editGuide(guide: Guide): void {
    this.guideEditMode.set('edit');
    this.guideEditingId.set(guide.id);
    this.guideForm = {
      number: guide.number,
      title_ar: guide.title.ar,
      title_en: guide.title.en,
      desc_ar: guide.desc.ar,
      desc_en: guide.desc.en,
      media_type_ar: guide.media?.ar?.type || 'image',
      media_src_ar: guide.media?.ar?.src || '',
      media_type_en: guide.media?.en?.type || 'image',
      media_src_en: guide.media?.en?.src || '',
    };
    this.guideLangTab.set('ar');
    this.mediaFileAr = null;
    this.mediaFileEn = null;
    this.uploading.set(false);
    this.uploadPercent.set(0);
    this.editingGuide.set(true);
  }

  async saveGuide(): Promise<void> {
    if (this.savingGuide()) {
      return;
    }

    const section = this.selectedSection();
    if (!section) return;

    const arText = this.stripHtml(this.guideForm.desc_ar);
    if (!arText) {
      this.guideLangTab.set('ar');
      alert(this.tr('شرح الدليل بالعربي مطلوب على الأقل', 'Arabic guide description is required at minimum'));
      return;
    }

    this.errorMessage.set('');
    this.savingGuide.set(true);
    this.uploading.set(true);
    this.uploadPercent.set(0);

    try {
      const arUploaded = await this.fileToMedia(section.route, this.guideForm.number, this.mediaFileAr, 'ar');
      this.uploadPercent.set(50);
      const enUploaded = await this.fileToMedia(section.route, this.guideForm.number, this.mediaFileEn, 'en');
      this.uploadPercent.set(100);

      const body = new FormData();
      if (this.guideEditMode() === 'edit') {
        body.set('id', this.guideEditingId());
      }

      body.set('route', section.route);
      body.set('number', String(this.guideForm.number));
      body.set('title_ar', this.guideForm.title_ar.trim());
      body.set('title_en', this.guideForm.title_en.trim());
      body.set('desc_ar', this.guideForm.desc_ar.trim());
      body.set('desc_en', this.guideForm.desc_en.trim());
      const arType = arUploaded?.type ?? this.resolveMediaType(this.guideForm.media_type_ar, this.guideForm.media_src_ar);
      const enType = enUploaded?.type ?? this.resolveMediaType(this.guideForm.media_type_en, this.guideForm.media_src_en);

      body.set('media_type_ar', arType);
      body.set('media_src_ar', arUploaded?.src ?? this.guideForm.media_src_ar.trim());
      body.set('media_type_en', enType);
      body.set('media_src_en', enUploaded?.src ?? this.guideForm.media_src_en.trim());

      await firstValueFrom(this.api.saveGuide(body));

      this.uploading.set(false);
      this.uploadPercent.set(0);
      this.savingGuide.set(false);
      this.editingGuide.set(false);
      this.persistSelectedSectionRoute(section.route);
      this.loadGuides(section.route);
    } catch (error) {
      this.uploading.set(false);
      this.uploadPercent.set(0);
      this.savingGuide.set(false);
      this.errorMessage.set(error instanceof Error ? error.message : this.tr('تعذر حفظ الدليل', 'Unable to save guide'));
    }
  }

  cancelGuideEdit(): void {
    this.savingGuide.set(false);
    this.uploading.set(false);
    this.uploadPercent.set(0);
    this.mediaFileAr = null;
    this.mediaFileEn = null;
    this.editingGuide.set(false);
  }

  private stripHtml(text: string): string {
    return (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private async fileToMedia(
    route: string,
    guideNumber: number,
    file: File | null,
    lang: 'ar' | 'en'
  ): Promise<{ type: 'image' | 'video' | 'gif'; src: string } | null> {
    if (!file) {
      return null;
    }

    const uploaded = await this.api.uploadGuideMedia(route, guideNumber, lang, file);

    if (lang === 'ar') {
      this.guideForm.media_type_ar = uploaded.type;
      this.guideForm.media_src_ar = uploaded.src;
    } else {
      this.guideForm.media_type_en = uploaded.type;
      this.guideForm.media_src_en = uploaded.src;
    }

    return uploaded;
  }

  private detectMediaTypeFromFile(file: File): 'image' | 'video' | 'gif' | null {
    const type = (file.type || '').toLowerCase();
    if (type === 'image/gif') {
      return 'gif';
    }

    if (type.startsWith('image/')) {
      return 'image';
    }

    if (type.startsWith('video/')) {
      return 'video';
    }

    const extension = (file.name.split('.').pop() || '').toLowerCase();
    if (extension === 'gif') {
      return 'gif';
    }

    if (['mp4', 'webm', 'mov', 'm4v'].includes(extension)) {
      return 'video';
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'bmp', 'svg'].includes(extension)) {
      return 'image';
    }

    return null;
  }

  private detectMediaTypeFromPath(path: string): 'image' | 'video' | 'gif' {
    const extension = (path.split('.').pop() || '').toLowerCase();
    if (extension === 'gif') {
      return 'gif';
    }

    if (['mp4', 'webm', 'mov', 'm4v'].includes(extension)) {
      return 'video';
    }

    return 'image';
  }

  private resolveMediaType(current: 'image' | 'video' | 'gif', src: string): 'image' | 'video' | 'gif' {
    const normalizedSrc = src.trim();
    if (!normalizedSrc) {
      return current;
    }

    return this.detectMediaTypeFromPath(normalizedSrc);
  }

  deleteGuide(guide: Guide): void {
    const section = this.selectedSection();
    if (!section) return;

    this.api.deleteGuide(section.route, guide.id).subscribe({
      next: () => {
        this.persistSelectedSectionRoute(section.route);
        this.loadGuides(section.route);
      },
      error: () => this.errorMessage.set(this.tr('تعذر حذف الدليل', 'Unable to delete guide')),
    });
  }

  askDeleteGuide(guide: Guide): void {
    this.deletingGuide.set(guide);
  }

  askDeleteSection(section: Section): void {
    this.deletingSection.set(section);
  }

  askDeleteGroup(group: Group): void {
    this.deletingGroup.set(group);
  }

  cancelDeleteGuide(): void {
    this.deletingGuide.set(null);
  }

  cancelDeleteSection(): void {
    this.deletingSection.set(null);
  }

  cancelDeleteGroup(): void {
    this.deletingGroup.set(null);
  }

  confirmDeleteGuide(): void {
    const guide = this.deletingGuide();
    if (!guide) {
      return;
    }

    this.deletingGuide.set(null);
    const section = this.selectedSection();
    if (!section) return;

    this.deleteGuide(guide);
  }

  confirmDeleteSection(): void {
    const section = this.deletingSection();
    if (!section) {
      return;
    }

    this.deletingSection.set(null);
    this.api.deleteSection(section.route).subscribe({
      next: () => {
        const selectedRoute = this.selectedSection()?.route;
        if (selectedRoute === section.route) {
          this.selectedSection.set(null);
          this.guides.set([]);
        }

        this.loadSections();
      },
      error: () => this.errorMessage.set(this.tr('تعذر حذف القسم', 'Unable to delete section')),
    });
  }

  confirmDeleteGroup(): void {
    const group = this.deletingGroup();
    if (!group) {
      return;
    }

    this.deletingGroup.set(null);
    this.api.deleteGroup(group.route).subscribe({
      next: () => {
        if (this.selectedGroup()?.route === group.route) {
          this.selectedGroup.set(null);
          this.selectedSection.set(null);
          this.guides.set([]);
        }

        this.loadGroups();
      },
      error: () => this.errorMessage.set(this.tr('تعذر حذف المجموعة', 'Unable to delete group')),
    });
  }

  logout(): void {
    this.deletingSection.set(null);
    this.deletingGroup.set(null);
    this.deletingGuide.set(null);
    this.editingGuide.set(false);
    this.editingSection.set(false);
    this.editingGroup.set(false);
    this.persistSelectedSectionRoute('');
    this.auth.logout().subscribe(() => {
      this.authenticated.set(false);
      this.username = '';
      this.password = '';
    });
  }

  private selectedSectionRoute(): string {
    const current = this.selectedSection()?.route?.trim();
    if (current) {
      return current;
    }

    return localStorage.getItem(this.selectedSectionKey)?.trim() || '';
  }

  private persistSelectedSectionRoute(route: string): void {
    const normalizedRoute = route.trim();
    if (!normalizedRoute) {
      localStorage.removeItem(this.selectedSectionKey);
      return;
    }

    localStorage.setItem(this.selectedSectionKey, normalizedRoute);
  }

  tr(ar: string, en: string): string {
    return this.lang() === 'ar' ? ar : en;
  }

}
//#endregion Edit By AI
