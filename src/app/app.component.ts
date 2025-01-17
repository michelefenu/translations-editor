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
      Drop translation files here
    </div>

    <div class="flex gap-2 items-center my-4 justify-between">
      <div class="flex gap-2 items-center">
        @if (languageOptions.length > 0) {
        <label for="language">Default Language:</label>
        <p-selectbutton
          id="language"
          name="language"
          [options]="languageOptions"
          [(ngModel)]="defaultLanguage"
          optionLabel="label"
          optionValue="value"
          aria-labelledby="basic"
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
            <div class="text-gray-900 flex items-center justify-between pe-10">
              <div>{{ getTranslationModel(defaultLanguage, label[0]) }}</div>
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
            <div class="w-10">
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
        background-color: #f0f0f0; /* Change to desired color */
      }
    `,
  ],
})
export class AppComponent implements OnInit {
  translationFiles = signal<TranslationFile[]>([]);
  labels = signal<{ language: string; label: string }[]>([]);

  defaultLanguage = 'en';
  languageOptions: { label: string; value: string }[] = [];

  isDragOver = false;

  private calculateLabelsCache = new Map<string, Record<string, string[]>>();

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
      console.log(this.translationFiles());
    });
  }

  ngOnInit() {
    const files = localStorage.getItem('translationFiles');
    if (files) {
      this.translationFiles.set(JSON.parse(files));
    }
  }

  uploadFile(event: any) {
    console.log('Loading files');
    for (const file of event.target.files) {
      const reader = new FileReader();
      reader.onloadend = (e) => {
        const fileName = file.name.replace('.json', '');
        if (this.translationFiles().find((f) => f.name === fileName)) {
          this.translationFiles.update((files) =>
            files.map((f) =>
              f.name === fileName
                ? {
                    ...f,
                    data: this.flattenObject(
                      JSON.parse(reader.result?.toString() ?? '{}')
                    ),
                  }
                : f
            )
          );
        } else {
          this.languageOptions = [
            ...this.languageOptions,
            { label: fileName, value: fileName },
          ];
          this.translationFiles.update((files) => [
            ...files,
            {
              name: fileName,
              data: this.flattenObject(
                JSON.parse(reader.result?.toString() ?? '{}')
              ),
            },
          ]);
        }
      };
      reader.readAsText(file);
    }
    console.log('Files loaded');
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

    console.log(files);
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
    return this.translationFiles().find((file) => file.name === language)?.data[
      label
    ];
  }

  updateTranslationModel(language: string, label: string, value: string) {
    console.log(language, label, value);
    const file = this.translationFiles().find((file) => file.name === language);
    if (file) {
      file.data[label] = value;
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
  }

  download(content: string, fileName: string, contentType: string) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
  }
}
