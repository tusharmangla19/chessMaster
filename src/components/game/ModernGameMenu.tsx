'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  Bot,
  Users,
  Crown,
  Search,
  Play,
  Star,
  Zap,
  Timer,
  Trophy
} from 'lucide-react';

interface ModernGameMenuProps {
  roomId: string;
  onRoomIdChange: (id: string) => void;
  onStartSinglePlayer: () => void;
  onStartMultiplayer: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  showTemporaryError: (message: string) => void;
}

export const ModernGameMenu = ({
  roomId,
  onRoomIdChange,
  onStartSinglePlayer,
  onStartMultiplayer,
  onCreateRoom,
  onJoinRoom,
  showTemporaryError
}: ModernGameMenuProps) => {
  const handleJoinRoom = () => {
    if (!roomId.trim()) {
      showTemporaryError("Please enter a room code");
      return;
    }
    
    const cleanRoomId = roomId.trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(cleanRoomId)) {
      showTemporaryError("Room code must be 6 characters (letters and numbers)");
      return;
    }
    
    onJoinRoom();
  };

  const gameOptions = [
    {
      id: 'single-player',
      title: 'Play vs AI',
      description: 'Challenge intelligent computer opponents',
      icon: Bot,
      color: 'from-purple-500 to-purple-700',
      badge: 'Popular',
      badgeColor: 'bg-green-500',
      onClick: onStartSinglePlayer,
      features: ['3 Difficulty Levels', 'Smart AI', 'Practice Mode']
    },
    {
      id: 'multiplayer',
      title: 'Find Opponent',
      description: 'Get matched with players instantly',
      icon: Users,
      color: 'from-blue-500 to-blue-700',
      badge: 'Quick',
      badgeColor: 'bg-blue-500',
      onClick: onStartMultiplayer,
      features: ['Instant Matching', 'Video Calls', 'Real-time Play']
    },
    {
      id: 'create-room',
      title: 'Create Room',
      description: 'Start a private game with friends',
      icon: Crown,
      color: 'from-amber-500 to-amber-700',
      badge: 'Private',
      badgeColor: 'bg-amber-500',
      onClick: onCreateRoom,
      features: ['Custom Room Code', 'Invite Friends', 'Private Games']
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          {/* <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,22H5V20H19V22M18,14V10L17,10L15,10C15,8.3 13.7,7 12,7C10.3,7 9,8.3 9,10L7,10L6,10V14H7L8,14V18H16V14L17,14H18M15,10H9V11H15V10M14,12H10V13H14V12Z"/>
              </svg>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white">
                 Choose your game mode and start playing<span className="text-purple-400">Master</span>
            </h1>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19,22H5V20H19V22M18,14V10L17,10L15,10C15,8.3 13.7,7 12,7C10.3,7 9,8.3 9,10L7,10L6,10V14H7L8,14V18H16V14L17,14H18M15,10H9V11H15V10M14,12H10V13H14V12Z"/>
              </svg>
            </div>
          </div> */}
          <h1 className="text-2xl md:text-3xl font-bold text-white">
                 Choose your game mode and start playing
            </h1>
        </div>



        {/* Game Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {gameOptions.map((option) => (
            <Card 
              key={option.id} 
              className="group bg-white/10 backdrop-blur-lg border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden"
              onClick={option.onClick}
            >
              <CardHeader className="relative pb-3">
                <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${option.color}`} />
                <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${option.color} shadow-lg`}>
                    <option.icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge className={`${option.badgeColor} text-white border-0`}>
                    {option.badge}
                  </Badge>
                </div>
                <CardTitle className="text-lg text-white group-hover:text-purple-300 transition-colors mt-2">
                  {option.title}
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm">
                  {option.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1 mb-4">
                  {option.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs text-gray-300">
                      <Star className="h-3 w-3 text-purple-400" />
                      {feature}
                    </div>
                  ))}
                </div>
                <Button 
                  className={`w-full bg-gradient-to-r ${option.color} hover:opacity-90 text-white border-0 text-sm`}
                  onClick={(e) => {
                    e.stopPropagation();
                    option.onClick?.();
                  }}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Play Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Join Room Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-400" />
              Join Private Room
            </CardTitle>
            <CardDescription className="text-gray-300">
              Enter a 6-character room code to join a private game
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Input
                  placeholder="Enter Room Code"
                  value={roomId}
                  onChange={(e) => onRoomIdChange(e.target.value.toUpperCase())}
                  className="bg-white/10 border-white/20 text-white placeholder-gray-400 text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>
              <Button 
                onClick={handleJoinRoom} 
                disabled={!roomId.trim()}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white px-6"
              >
                <Search className="h-4 w-4 mr-2" />
                Join
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Room codes are 6 characters long and case-insensitive
            </p>
          </CardContent>
        </Card>

        {/* Quick Tips */}
        <Card className="bg-white/5 backdrop-blur-lg border-white/10">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <Timer className="h-4 w-4 text-purple-400" />
                <span>Games auto-save on disconnect</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <Zap className="h-4 w-4 text-purple-400" />
                <span>Video calls available in multiplayer</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 