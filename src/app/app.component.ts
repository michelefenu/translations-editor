import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
interface TranslationFile {
  name: string;
  data: Record<string, string>;
}

@Component({
  standalone: true,
  imports: [CommonModule, ButtonModule, InputTextModule, FormsModule],
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="drag-drop-area"
      (dragover)="onDragOver($event)"
      (drop)="onDrop($event)"
    >
      Drop translation files here
    </div>

    @for (file of translationFiles(); track file.name) {
    <div>
      {{ file.name }}
    </div>
    }

    @for (label of objectToKeyValueArray(calculateLabels(translationFiles())); track label[0]) {
      <div>
        {{ label[0] }}: {{ label[1] }}
        @for (language of label[1]; track language) {
          @defer {
            <div>
              <input pInputText type="text" #f [value]="getTranslationModel(language, label[0])" (change)="updateTranslationModel(language, label[0], f.value)" />
            </div>
          }
        }
      </div>
    }

    <button (click)="save()">Save</button>
  `,
  styles: [
    `
      .drag-drop-area {
        border: 2px dashed #ccc;
        padding: 20px;
        text-align: center;
      }
    `,
  ],
})
export class AppComponent {
  translationFiles = signal<TranslationFile[]>([]);
  labels = signal<{ language: string; label: string }[]>([]);

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
                  data: this.flattenObject(JSON.parse(reader.result?.toString() ?? '{}')),
                }
                : f,
            )
          );
        } else {
          this.translationFiles.update((files) => [
            ...files,
            {
              name: fileName,
              data: this.flattenObject(JSON.parse(reader.result?.toString() ?? '{}')),
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
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
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
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
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
  
    return result;
  }

  getTranslationModel(language: string, label: string) {
    return this.translationFiles().find((file) => file.name === language)?.data[label];
  }

  updateTranslationModel(language: string, label: string, value: string) {
    console.log(language, label, value);
    const file = this.translationFiles().find((file) => file.name === language);
    if (file) {
      file.data[label] = value;
    }
  }

  save() {
    console.log(this.translationFiles());
  }
}
