import {
  ChangeDetectionStrategy,
  Component,
  effect,
  OnInit,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule, UpperCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AccordionModule } from 'primeng/accordion';
import { BadgeModule } from 'primeng/badge';
interface TranslationFile {
  name: string;
  data: Record<string, string>;
}

@Component({
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    InputTextModule,
    FormsModule,
    SelectButtonModule,
    AccordionModule,
    BadgeModule,
    UpperCasePipe,
  ],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="drag-drop-area h-[120px] flex items-center justify-center"
      [class.drag-over]="isDragOver"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <div class="text-gray-500">
        Drop translation files here
        <div class="text-gray-500">
          or
          <input #fileInput type="file" [hidden]="true" multiple (change)="uploadFile($event)">
          <button pButton size="small" type="button" (click)="fileInput.click()" severity="secondary">
            Upload
          </button>
        </div>
      </div>
    </div>

    <div class="flex gap-2 items-center my-4 justify-between">
      <div class="flex gap-2 items-center">
        @if (languageOptions.length > 0) {
        <span>Default Language</span>
        <p-selectbutton
          input="language"
          name="language"
          [options]="languageOptions"
          [(ngModel)]="defaultLanguage"
          optionLabel="label"
          optionValue="value"
        />

        } @else {
        <div>No files uploaded</div>
        }
      </div>
      <div>
        <button pButton type="button" (click)="save()" class="me-2">
          EXPORT
        </button>
        <button pButton type="button" (click)="reset()" severity="danger">
          RESET
        </button>
      </div>
    </div>
    @for (label of objectToKeyValueArray(calculateLabels(translationFiles()));
    track label[0]; let i = $index) {
    <p-accordion [value]="i">
      @defer(on viewport) {
      <p-accordion-panel [value]="label[0]">
        <p-accordion-header>
          <div class="flex flex-col w-full">
            <div class="text-gray-900 dark:text-white flex items-center justify-between pe-10">
              @let defaultTranslation = getTranslationModel(defaultLanguage, label[0]);
              <div>{{ defaultTranslation || '[no translation found in default language]' }}</div>
              <div class="mt-6">
                @for (language of label[1]; track language) {
                <p-badge
                  [value]="language | uppercase"
                  severity="success"
                  class="m-1"
                  [severity]="
                    getTranslationModel(language, label[0])
                      ? 'success'
                      : 'danger'
                  "
                />
                }
              </div>
            </div>
            <div>
              <small class="text-gray-500">{{ label[0] }}</small>
            </div>
          </div>
        </p-accordion-header>

        @for (language of label[1]; track language) {
        <p-accordion-content>
          @defer(on viewport) {
          <div class="flex items-center">
            <div class="min-w-10">
              <p-badge
                [value]="language | uppercase"
                class="me-2"
                [severity]="
                  getTranslationModel(language, label[0]) ? 'success' : 'danger'
                "
              />
            </div>
            <input
              pInputText
              type="text"
              #f
              class="w-[500px]"
              [value]="getTranslationModel(language, label[0])"
              (change)="updateTranslationModel(language, label[0], f.value)"
            />
          </div>
          } @placeholder {
          <div>Loading...</div>
          }
        </p-accordion-content>
        }
      </p-accordion-panel>
      } @placeholder {
      <div>Loading...</div>
      }
    </p-accordion>
    }
  `,
  styles: [
    `
      .drag-drop-area {
        border: 2px dashed #ccc;
        padding: 20px;
        text-align: center;
        transition: background-color 0.3s;
      }
      .drag-drop-area.drag-over {
        background-color: #f0f0f0;
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  translationFiles = signal<TranslationFile[]>([]);
  labels = signal<{ language: string; label: string }[]>([]);

  defaultLanguage = '';
  languageOptions: { label: string; value: string }[] = [];

  isDragOver = false;

  private calculateLabelsCache = new Map<string, Record<string, string[]>>();
  private translationMap = new Map<string, Record<string, string>>();
  private translationModelCache = new Map<string, string>();

  constructor() {
    effect(() => {
      localStorage.setItem(
        'translationFiles',
        JSON.stringify(this.translationFiles())
      );
      this.languageOptions = this.translationFiles().map((file) => ({
        label: file.name,
        value: file.name,
      }));

      this.translationMap.clear();
      this.translationFiles().forEach((file) => {
        this.translationMap.set(file.name, file.data);
      });
    });
  }

  ngOnInit() {
    const files = localStorage.getItem('translationFiles');
    if (files) {
      this.translationFiles.set(JSON.parse(files));
    }

    if (this.defaultLanguage === '') {
      this.defaultLanguage = this.translationFiles()[0]?.name || '';
    }
  }

  uploadFile(event: any) {
    const files = Array.from(event.target.files);
    Promise.all(
      files.map((file:any) => {
        return new Promise<TranslationFile>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => {
            const fileName = file.name.replace('.json', '');
            const newFileData = this.flattenObject(
              JSON.parse(reader.result?.toString() ?? '{}')
            );
            resolve({ name: fileName, data: newFileData });
          };
          reader.readAsText(file);
        });
      })
    ).then((newFiles) => {
      this.translationFiles.update((existingFiles) => {
        const updatedFiles = [...existingFiles];
        
        // Process all new files at once
        newFiles.forEach((newFile) => {
          const existingIndex = updatedFiles.findIndex(f => f.name === newFile.name);
          if (existingIndex !== -1) {
            updatedFiles[existingIndex] = newFile;
          } else {
            updatedFiles.push(newFile);
          }
        });

        // Update missing keys across all files in a single pass
        const allKeys = new Set<string>();
        updatedFiles.forEach(file => {
          Object.keys(file.data).forEach(key => allKeys.add(key));
        });

        updatedFiles.forEach(file => {
          allKeys.forEach(key => {
            if (!file.data.hasOwnProperty(key)) {
              file.data[key] = '';
            }
          });
        });

        return updatedFiles;
      });
    }).then(() => {
      this.defaultLanguage = this.translationFiles()[0]?.name || '';
    });
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent) {
    this.isDragOver = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files.length) {
      this.uploadFile({ target: { files: event.dataTransfer.files } });
    }
  }

  flattenObject(
    obj: Record<string, any>,
    parentKey: string = '',
    result: Record<string, any> = {}
  ): Record<string, any> {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if (
          typeof obj[key] === 'object' &&
          obj[key] !== null &&
          !Array.isArray(obj[key])
        ) {
          this.flattenObject(obj[key], newKey, result);
        } else {
          result[newKey] = obj[key];
        }
      }
    }
    return result;
  }

  unflattenObject(flattened: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const flatKey in flattened) {
      if (flattened.hasOwnProperty(flatKey)) {
        const keys = flatKey.split('.');
        keys.reduce((acc, key, index) => {
          if (index === keys.length - 1) {
            acc[key] = flattened[flatKey];
          } else {
            acc[key] = acc[key] || {};
          }
          return acc[key];
        }, result);
      }
    }

    return result;
  }

  objectToKeyValueArray(obj: Record<string, any>): [string, any][] {
    return Object.entries(obj);
  }

  calculateLabels(files: TranslationFile[]): Record<string, string[]> {
    const cacheKey = JSON.stringify(files);
    if (this.calculateLabelsCache.has(cacheKey)) {
      return this.calculateLabelsCache.get(cacheKey)!;
    }

    const result: Record<string, string[]> = {};

    for (const file of files) {
      for (const key in file.data) {
        if (file.data.hasOwnProperty(key)) {
          if (!result[key]) {
            result[key] = [];
          }
          result[key].push(file.name);
        }
      }
    }

    this.calculateLabelsCache.set(cacheKey, result);
    return result;
  }

  getTranslationModel(language: string, label: string) {
    const cacheKey = `${language}:${label}`;
    if (this.translationModelCache.has(cacheKey)) {
      return this.translationModelCache.get(cacheKey);
    }
    
    const result = this.translationMap.get(language)?.[label];
    this.translationModelCache.set(cacheKey, result || '');
    return result;
  }

  updateTranslationModel(language: string, label: string, value: string) {
    const files = this.translationFiles();
    const fileIndex = files.findIndex((file) => file.name === language);
    if (fileIndex !== -1) {
      files[fileIndex].data[label] = value;
      this.translationFiles.set([...files]);
      // Clear cache when updating translations
      this.translationModelCache.clear();
    }
  }

  save() {
    this.translationFiles().forEach((file) => {
      this.download(
        JSON.stringify(this.unflattenObject(file.data)),
        file.name,
        'application/json'
      );
    });
  }

  reset() {
    if (window.confirm('Are you sure you want to reset?')) {
      this.translationFiles.set([]);
    }
    this.defaultLanguage = '';
  }

  download(content: string, fileName: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  }
}
