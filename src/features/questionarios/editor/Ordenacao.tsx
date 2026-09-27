import type { CSSProperties, ReactNode } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';

interface ListaOrdenavelProps {
  ids: string[];
  onReordenar: (novosIds: string[]) => void;
  children: ReactNode;
}

/** Arrastar com mouse, toque ou teclado (Espaço + setas). Há sempre a alternativa dos botões ↑↓. */
export function ListaOrdenavel({ ids, onReordenar, children }: ListaOrdenavelProps) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleFim({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const de = ids.indexOf(String(active.id));
    const para = ids.indexOf(String(over.id));
    if (de >= 0 && para >= 0) onReordenar(arrayMove(ids, de, para));
  }

  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={handleFim}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

interface ItemOrdenavelProps {
  id: string;
  rotuloAlca: string;
  className?: string;
  children: (alca: ReactNode) => ReactNode;
}

export function ItemOrdenavel({ id, rotuloAlca, className, children }: ItemOrdenavelProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  // O dnd-kit posiciona o item durante o arraste por style; é a única exceção ao "sem style inline".
  const estilo: CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  const alca = (
    <button
      type="button"
      aria-label={rotuloAlca}
      className="grid min-h-11 min-w-8 flex-none cursor-grab touch-none place-items-center text-muted hover:text-foreground"
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-5" aria-hidden="true" />
    </button>
  );

  return (
    <div ref={setNodeRef} style={estilo} className={`${className ?? ''} ${isDragging ? 'relative z-10 opacity-80 shadow-lg' : ''}`}>
      {children(alca)}
    </div>
  );
}
