'use client';

import { closestCenter, DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MoveSectionCommand, UpdateSectionCommand } from '@editor/editor-core';
import { renderSection } from '@editor/renderer';
import type { Page, Section } from '@editor/schema';
import { type CSSProperties, useEffect, useState } from 'react';
import { useEditorStore } from '../hooks/useEditorStore';
import '../lib/sections'; // registers demo placeholder components as a side effect
import { PropertyPanel } from './PropertyPanel';

function SortableSection({
  section,
  selected,
  onSelect,
}: {
  section: Section;
  selected: boolean;
  onSelect: () => void;
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
      <div
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', fontSize: 12, color: '#888', padding: '4px 8px', userSelect: 'none' }}
      >
        ⠿ przeciągnij — {section.type}
      </div>
      {/* A `<button>` can't wrap renderSection's own interactive content (e.g. the newsletter
          placeholder's submit button) — nested interactive elements are invalid HTML — so this is
          a plain div with a click handler instead. */}
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

export function Canvas({ initialPage }: { initialPage: Page }) {
  const { page, execute, undo, redo, canUndo, canRedo } = useEditorStore(initialPage);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const orderedSections = [...page.sections].sort((a, b) => a.position - b.position);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedSection = orderedSections.find((section) => section.id === selectedId) ?? null;

  // dnd-kit generates internal ids (aria-describedby, etc.) that aren't guaranteed to match
  // between the server-rendered HTML and the client's first render, which React flags as a
  // hydration mismatch. Deferring DndContext to after mount — the standard pattern for
  // client-only interactive libraries — sidesteps that instead of fighting dnd-kit's id generator.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const undoRedoBar = (
    <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
      <button type="button" onClick={undo} disabled={!canUndo}>
        ↶ Cofnij
      </button>
      <button type="button" onClick={redo} disabled={!canRedo}>
        ↷ Ponów
      </button>
    </div>
  );

  if (!mounted) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: 24 }}>
        {undoRedoBar}
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
        {undoRedoBar}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedSections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
            {orderedSections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                selected={section.id === selectedId}
                onSelect={() => setSelectedId(section.id)}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      {selectedSection && <PropertyPanel section={selectedSection} onChange={handlePropertyChange} />}
    </div>
  );
}
