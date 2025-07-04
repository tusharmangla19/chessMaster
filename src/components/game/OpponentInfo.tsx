import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { User, Users, Bot } from "lucide-react";
import { GameMode } from "./types";

interface OpponentInfoProps {
    gameMode: GameMode;
    opponentConnected: boolean;
    opponentInfo?: {
        name?: string;
        email?: string;
        clerkId?: string;
    } | null;
    selectedDifficulty?: string | null;
}

export const OpponentInfo = ({
    gameMode,
    opponentConnected,
    opponentInfo,
    selectedDifficulty
}: OpponentInfoProps) => {
    const getOpponentDisplay = () => {
        if (gameMode === 'single_player') {
            return {
                name: `AI Player (${selectedDifficulty || 'Medium'})`,
                subtitle: 'Computer Opponent',
                icon: <Bot className="h-4 w-4" />,
                status: 'active'
            };
        }

        if (!opponentInfo) {
            return {
                name: 'Anonymous Player',
                subtitle: 'Opponent',
                icon: <User className="h-4 w-4" />,
                status: opponentConnected ? 'connected' : 'disconnected'
            };
        }

        // Try to get a display name from available info
        let displayName = 'Anonymous Player';
        let subtitle = '';

        if (opponentInfo.name) {
            displayName = opponentInfo.name;
            subtitle = 'Opponent';
        } else if (opponentInfo.email) {
            displayName = opponentInfo.email.split('@')[0]; // Use email username part
            subtitle = opponentInfo.email;
        } else if (opponentInfo.clerkId) {
            displayName = `Player ${opponentInfo.clerkId.slice(-6)}`; // Last 6 chars of clerkId
            subtitle = 'Opponent';
        }

        return {
            name: displayName,
            subtitle,
            icon: <User className="h-4 w-4" />,
            status: opponentConnected ? 'connected' : 'disconnected'
        };
    };

    const opponent = getOpponentDisplay();

    const getStatusBadge = () => {
        if (gameMode === 'single_player') {
            return (
                <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-400">
                    AI
                </Badge>
            );
        }

        if (opponent.status === 'connected') {
            return (
                <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-400">
                    Online
                </Badge>
            );
        } else {
            return (
                <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-400">
                    Offline
                </Badge>
            );
        }
    };

    return (
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader className="pb-2">
                <CardTitle className="text-white text-center text-sm flex items-center justify-center gap-2">
                    <Users className="h-4 w-4" />
                    Playing Against
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                        <div className="flex-shrink-0 text-white/80">
                            {opponent.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-white font-medium text-sm truncate">
                                {opponent.name}
                            </p>
                            {opponent.subtitle && (
                                <p className="text-gray-400 text-xs truncate">
                                    {opponent.subtitle}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="flex-shrink-0">
                        {getStatusBadge()}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}; 