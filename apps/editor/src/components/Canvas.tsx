'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AddSectionCommand,
  DeleteSectionCommand,
  MoveSectionCommand,
  UpdateSectionCommand,
} from '@pawelekbyra/editor-core';
import { renderPage, renderSection } from '@pawelekbyra/renderer';
import type { Page, Section, SectionType } from '@pawelekbyra/schema';
import { type CSSProperties, useEffect, useState, useTransition } from 'react';
import { savePage } from '../app/actions';
import { useEditorStore } from '../hooks/useEditorStore';
import { ADDABLE_SECTION_TYPES, createSection } from '../lib/createSection';
import '../lib/sections'; // registers section components as a side effect
import { PropertyPanel } from './PropertyPanel';

function SortableSection({
  section,
  selected,
  onSelect,
  onDelete,
}: {
  section: Section;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
    opacity: isDragging ? 0.4 : 1,
    border: selected ? '2px solid #4a7dff' : '1px solid #ddd',
    borderRadius: 4,
    marginBottom: 8,
    background: '#fff',
  };

  return (
    <div ref={setNodeRef} style={style} data-testid={`section-${section.id}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px' }}>
        <span {...attributes} {...listeners} style={{ cursor: 'grab', fontSize: 12, color: '#888', userSelect: 'none' }}>
          ⠿ przeciągnij — {section.type}
        </span>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Usuń sekcję ${section.type}`}
          style={{ fontSize: 12, color: '#c00', border: 'none', background: 'none', cursor: 'pointer' }}
        >
          🗑 Usuń
        </button>
      </div>
      {/* A `<button>` can't wrap renderSection's own interactive content (nested interactive
          elements are invalid HTML) — so this is a plain div with a click handler. */}
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') onSelect();
        }}
        style={{ padding: '0 8px 8px', cursor: 'pointer' }}
      >
        {renderSection(section, { mode: 'edit' })}
      </div>
    </div>
  );
}

function SectionPalette({ onAdd }: { onAdd: (type: SectionType) => void }) {
  return (
    <div style={{ marginTop: 12, padding: 12, border: '1px dashed #ccc', borderRadius: 4 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>+ Dodaj sekcję</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ADDABLE_SECTION_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => onAdd(type)}
            style={{ fontSize: 12, padding: '4px 8px', cursor: 'pointer' }}
          >
            + {type}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Canvas({ initialPage }: { initialPage: Page }) {
  const { page, execute, undo, redo, canUndo, canRedo } = useEditorStore(initialPage);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const orderedSections = [...page.sections].sort((a, b) => a.position - b.position);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const selectedSection = orderedSections.find((section) => section.id === selectedId) ?? null;

  const [isSaving, startSaving] = useTransition();
  const [saveState, setSaveState] = useState<{ status: 'idle' | 'saved' | 'error'; message?: string }>({
    status: 'idle',
  });

  function handleSave() {
    startSaving(async () => {
      try {
        await savePage(page);
        setSaveState({ status: 'saved' });
      } catch (err) {
        setSaveState({ status: 'error', message: err instanceof Error ? err.message : 'Nie udało się zapisać' });
      }
    });
  }

  // dnd-kit generates internal ids (aria-describedby, etc.) that aren't guaranteed to match
  // between SSR and the client's first render → hydration mismatch. Deferring DndContext to after
  // mount is the standard pattern for client-only interactive libraries.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Any edit invalidates a previous "saved" confirmation — `page` gets a new identity on every
  // command, while saving leaves it untouched, so this fires exactly on edits.
  useEffect(() => setSaveState({ status: 'idle' }), [page]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const targetIndex = orderedSections.findIndex((section) => section.id === over.id);
    if (targetIndex === -1) return;
    execute(new MoveSectionCommand(String(active.id), targetIndex));
  }

  function handlePropertyChange(key: string, value: string | number | boolean) {
    if (!selectedSection) return;
    execute(new UpdateSectionCommand(selectedSection.id, { [key]: value }));
  }

  function handleAdd(type: SectionType) {
    const section = createSection(type);
    execute(new AddSectionCommand(section, orderedSections.length));
    setSelectedId(section.id);
  }

  function handleDelete(sectionId: string) {
    execute(new DeleteSectionCommand(sectionId));
    if (selectedId === sectionId) setSelectedId(null);
  }

  const toolbar = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
      <button type="button" onClick={undo} disabled={!canUndo || viewMode === 'preview'}>
        ↶ Cofnij
      </button>
      <button type="button" onClick={redo} disabled={!canRedo || viewMode === 'preview'}>
        ↷ Ponów
      </button>
      <span style={{ flex: 1 }} />
      {saveState.status === 'saved' && <span style={{ fontSize: 12, color: '#2a7' }}>✓ zapisano</span>}
      {saveState.status === 'error' && (
        <span style={{ fontSize: 12, color: '#c00' }} title={saveState.message}>
          ✗ błąd zapisu
        </span>
      )}
      <button type="button" onClick={handleSave} disabled={isSaving} data-testid="save">
        {isSaving ? '… Zapisywanie' : '💾 Zapisz'}
      </button>
      <button
        type="button"
        onClick={() => setViewMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
        style={{ fontWeight: 600 }}
      >
        {viewMode === 'edit' ? '👁 Podgląd' : '✏ Edytuj'}
      </button>
    </div>
  );

  // Preview: render the whole page in `live` mode with no editor chrome — as a customer sees it.
  if (viewMode === 'preview') {
    return (
      <div style={{ maxWidth: 940, margin: '0 auto', padding: 24 }}>
        {toolbar}
        <div data-testid="live-preview" style={{ border: '1px solid #eee', borderRadius: 4, padding: 16, background: '#fff' }}>
          {renderPage(page, { mode: 'live' })}
        </div>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div style={{ maxWidth: 940, margin: '0 auto', padding: 24 }}>
        {toolbar}
        {orderedSections.map((section) => (
          <div key={section.id} style={{ border: '1px solid #ddd', borderRadius: 4, marginBottom: 8 }}>
            <div style={{ padding: '0 8px 8px' }}>{renderSection(section, { mode: 'edit' })}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 940, margin: '0 auto', padding: 24, display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {toolbar}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
            {orderedSections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                selected={section.id === selectedId}
                onSelect={() => setSelectedId(section.id)}
                onDelete={() => handleDelete(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
        <SectionPalette onAdd={handleAdd} />
      </div>
      {selectedSection && <PropertyPanel section={selectedSection} onChange={handlePropertyChange} />}
    </div>
  );
}
