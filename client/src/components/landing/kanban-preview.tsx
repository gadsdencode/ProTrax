import { cn } from "@/lib/utils";

interface KanbanCard {
  title: string;
  tag: string;
  tagColor: string;
}

interface KanbanColumn {
  name: string;
  cards: KanbanCard[];
  headerColor: string;
}

const kanbanColumns: KanbanColumn[] = [
  {
    name: "To Do",
    headerColor: "bg-muted",
    cards: [
      { title: "API Integration", tag: "Backend", tagColor: "bg-chart-1/20 text-chart-1" },
      { title: "User Testing", tag: "QA", tagColor: "bg-chart-3/20 text-chart-3" },
    ],
  },
  {
    name: "In Progress",
    headerColor: "bg-primary/20",
    cards: [
      { title: "Dashboard UI", tag: "Frontend", tagColor: "bg-chart-2/20 text-chart-2" },
    ],
  },
  {
    name: "Done",
    headerColor: "bg-chart-2/20",
    cards: [
      { title: "Auth Flow", tag: "Backend", tagColor: "bg-chart-1/20 text-chart-1" },
    ],
  },
];

export function KanbanPreview() {
  return (
    <div className="w-full h-full min-h-[200px] p-3 rounded-xl bg-background/50 border border-border/50">
      <div className="flex gap-3 h-full">
        {kanbanColumns.map((column, colIndex) => (
          <div
            key={column.name}
            className={cn(
              "flex-1 min-w-0 flex flex-col",
              "animate-in fade-in-0 slide-in-from-bottom-4 duration-500"
            )}
            style={{ animationDelay: `${colIndex * 150}ms` }}
          >
            {/* Column header */}
            <div className={cn(
              "px-2 py-1.5 rounded-t-lg text-xs font-medium mb-2",
              column.headerColor
            )}>
              <span className="truncate block">{column.name}</span>
              <span className="text-muted-foreground">({column.cards.length})</span>
            </div>
            
            {/* Cards */}
            <div className="space-y-2 flex-1">
              {column.cards.map((card, cardIndex) => (
                <div
                  key={card.title}
                  className={cn(
                    "p-2 rounded-lg bg-card border border-border/50 text-xs",
                    "transition-all duration-200",
                    "hover:shadow-md hover:border-primary/30 hover:-translate-y-0.5",
                    "animate-in fade-in-0 slide-in-from-left-4 duration-300"
                  )}
                  style={{ animationDelay: `${colIndex * 150 + cardIndex * 100 + 300}ms` }}
                >
                  <p className="font-medium truncate mb-1.5">{card.title}</p>
                  <span className={cn(
                    "inline-block px-1.5 py-0.5 rounded text-[10px] font-medium",
                    card.tagColor
                  )}>
                    {card.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      {/* WIP limit indicator */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>WIP Limit: 3</span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-chart-2 animate-pulse" />
          Real-time sync
        </span>
      </div>
    </div>
  );
}

