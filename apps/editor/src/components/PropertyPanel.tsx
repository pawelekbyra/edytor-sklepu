'use client';

import type { Section } from '@pawelekbyra/schema';
import { fieldsFromPreferencesSchema } from '../lib/fieldsFromSchema';
import { SECTION_PREFERENCES_SCHEMA } from '../lib/sectionSchemas';

interface Props {
  section: Section;
  onChange: (key: string, value: string | number | boolean) => void;
}

export function PropertyPanel({ section, onChange }: Props) {
  const schema = SECTION_PREFERENCES_SCHEMA.get(section.type);
  const fields = schema ? fieldsFromPreferencesSchema(schema) : [];
  const preferences = section.preferences as Record<string, unknown>;

  return (
    <div style={{ width: 260, flexShrink: 0, border: '1px solid #ddd', borderRadius: 4, padding: 12 }}>
      <h3 style={{ marginTop: 0, fontSize: 14 }}>Właściwości — {section.type}</h3>
      {fields.length === 0 && <p style={{ color: '#888', fontSize: 12 }}>Brak edytowalnych pól.</p>}
      {fields.map((field) => {
        if (field.kind === 'unsupported') return null;
        const value = preferences[field.key];

        return (
          <label key={field.key} style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
            {field.key}
            {field.kind === 'string' && (
              <input
                type="text"
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                style={{ display: 'block', width: '100%' }}
              />
            )}
            {field.kind === 'number' && (
              <input
                type="number"
                value={typeof value === 'number' ? value : 0}
                onChange={(event) => onChange(field.key, Number(event.target.value))}
                style={{ display: 'block', width: '100%' }}
              />
            )}
            {field.kind === 'boolean' && (
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(event) => onChange(field.key, event.target.checked)}
              />
            )}
            {field.kind === 'enum' && (
              <select
                value={typeof value === 'string' ? value : ''}
                onChange={(event) => onChange(field.key, event.target.value)}
                style={{ display: 'block', width: '100%' }}
              >
                {field.options?.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}
          </label>
        );
      })}
    </div>
  );
}
