/**
 * Backend/status feedback panel used during local WAMP validation.
 */
import React, { useEffect, useState } from 'react';
import { Activity, Clock } from 'lucide-react';

interface StatusPanelProps {
    catalogCount: number;
    moviesCount: number;
    showsCount: number;
    isLoading: boolean;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ catalogCount, moviesCount, showsCount, isLoading }) => {
    const [lastUpdate, setLastUpdate] = useState<string>('');

    useEffect(() => {
        setLastUpdate(new Date().toLocaleTimeString());
    }, [catalogCount, moviesCount, showsCount]);

    return (
        <div className="w-full bg-background/60 backdrop-blur-md border-b border-border/40 py-1.5 px-4 flex items-center justify-between fixed top-16 md:top-20 z-40 transition-all duration-300">
            <div className="flex items-center gap-4 md:gap-6 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">Catálogo: <span className="text-foreground">{catalogCount}</span></span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">Filmes: <span className="text-foreground">{moviesCount}</span></span>
                </div>
                <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <div className="w-1.5 h-1.5 rounded-full bg-warning" />
                    <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider">Séries: <span className="text-foreground">{showsCount}</span></span>
                </div>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
                {isLoading ? (
                    <Activity className="w-3 h-3 animate-spin text-primary" />
                ) : (
                    <Clock className="w-3 h-3" />
                )}
                <span className="text-[10px] md:text-xs font-medium tabular-nums">
                    {isLoading ? 'A atualizar...' : lastUpdate}
                </span>
            </div>
        </div>
    );
};

export default StatusPanel;
